import { Worker, Job } from 'bullmq';
import crypto from 'crypto';
import fs from 'fs';
import { CONFIG } from '../config';
import { extractText, chunkText } from '../utils/text-processor';
import { VectorService } from '../services/vector.service';
import { IndexingJobData, JobResult } from '../types/job.types';
import { VectorPoint } from '../types/vector.types';
import { logger } from '../utils/logger';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { companyRepository } from '../repositories/company.repository';
import { ProcessingStatus } from '../schemas/file-metadata.schema';

// Helper for deterministic IDs
function generatePointId(
  companyId: string,
  fileId: string,
  contentHash: string,
  index: number
): string {
  return crypto
    .createHash('md5') // MD5 is fine for IDs, faster than SHA
    .update(`${companyId}:${fileId}:${contentHash}:${index}`)
    .digest('hex');
}

const worker = new Worker<IndexingJobData, JobResult>(
  'indexing-queue',
  async (job: Job<IndexingJobData, JobResult>) => {
    const { companyId, fileId, filePath, mimetype } = job.data;

    logger.info('Processing job started', {
      jobId: job.id,
      companyId,
      fileId,
      mimetype,
    });

    await job.updateProgress(10); // 10% - Starting

    try {
      // Update file status to PROCESSING
      await fileMetadataRepository.updateProcessingStatus(fileId, ProcessingStatus.PROCESSING);

      // 1. Extract
      logger.debug('Extracting text', { jobId: job.id, filePath });
      const rawText = await extractText(filePath, mimetype);

      // 2. Chunk
      const chunks = chunkText(rawText);
      await job.updateProgress(30); // 30% - Text ready

      logger.info('Text extracted and chunked', {
        jobId: job.id,
        textLength: rawText.length,
        chunksCount: chunks.length,
      });

      if (chunks.length === 0) {
        await fileMetadataRepository.updateProcessingStatus(fileId, ProcessingStatus.FAILED);
        await fileMetadataRepository.update(fileId, {
          errorMessage: 'No text extracted from file',
        });
        throw new Error('No text extracted');
      }

      // Update file metadata with text info
      await fileMetadataRepository.update(fileId, {
        textExtracted: true,
        textLength: rawText.length,
        chunkCount: chunks.length,
      });

      // 3. Batch Process (Embed + Upsert)
      const BATCH_SIZE = 50; // Process 50 chunks at a time
      const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = start + BATCH_SIZE;
        const batchChunks = chunks.slice(start, end);

        logger.debug('Processing batch', {
          jobId: job.id,
          batch: i + 1,
          totalBatches,
          batchSize: batchChunks.length,
        });

        // Embed the batch
        const vectors = await VectorService.getEmbeddings(batchChunks);

        // Map to Qdrant Points with Deterministic IDs
        const points: VectorPoint[] = batchChunks.map((chunk, idx) => {
          const globalIndex = start + idx;
          // Hash the content for idempotency
          const contentHash = crypto.createHash('sha256').update(chunk).digest('hex');

          return {
            id: generatePointId(companyId, fileId, contentHash, globalIndex),
            vector: vectors[idx],
            payload: {
              fileId,
              companyId,
              text_preview: chunk.slice(0, 200), // Save space, don't store full chunk
              chunkIndex: globalIndex,
              // We deliberately exclude full text here to save RAM.
              // Fetch full text from SQL/Blob storage if needed.
            },
          };
        });

        // Upsert Batch
        const collection = `company_${companyId}`;
        await VectorService.ensureCollection(collection);
        await VectorService.upsertBatch(collection, points);

        // Update job progress
        const progress = 30 + Math.floor(((i + 1) / totalBatches) * 70);
        await job.updateProgress(progress);
      }

      // Update vector indexing status
      const collection = `company_${companyId}`;
      await fileMetadataRepository.updateVectorIndexed(fileId, true, collection, chunks.length);
      await fileMetadataRepository.updateProcessingStatus(fileId, ProcessingStatus.COMPLETED);

      // Update company storage used
      const fileMetadata = await fileMetadataRepository.findById(fileId);
      if (fileMetadata) {
        await companyRepository.updateStorageUsed(companyId, fileMetadata.size);
      }

      // Cleanup uploaded file to save disk space
      try {
        fs.unlinkSync(filePath);
        logger.debug('Uploaded file cleaned up', { jobId: job.id, filePath });
      } catch (e) {
        logger.warn('Failed to cleanup file', { jobId: job.id, filePath, error: e });
      }

      logger.info('Job completed successfully', {
        jobId: job.id,
        companyId,
        fileId,
        chunksProcessed: chunks.length,
      });

      return { status: 'completed', chunks: chunks.length };
    } catch (error) {
      logger.error('Job failed', {
        jobId: job.id,
        companyId,
        fileId,
        error,
      });

      // Update file status to FAILED and increment retry count
      await fileMetadataRepository.updateProcessingStatus(fileId, ProcessingStatus.FAILED);
      await fileMetadataRepository.incrementRetryCount(
        fileId,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  },
  {
    connection: { host: CONFIG.REDIS_HOST, port: CONFIG.REDIS_PORT },
    concurrency: 2, // Process 2 files in parallel
  }
);

// Log worker events
worker.on('completed', (job) => {
  logger.info('Worker completed job', { jobId: job.id });
});

worker.on('failed', (job, err) => {
  logger.error('Worker failed job', {
    jobId: job?.id,
    error: err.message,
    stack: err.stack,
  });
});

worker.on('error', (err) => {
  logger.error('Worker error', { error: err.message, stack: err.stack });
});

logger.info('Worker started', { concurrency: 2, queue: 'indexing-queue' });

export default worker;
