import { Job } from 'bullmq';
import { generateContentHash, generatePointId } from '../../utils/hash.util';
import { extractText, chunkText } from '../../utils/text-processor';
import { VectorService, EmbeddingProvider } from '../../services/vector.service';
import { IndexingJobData, JobResult } from '../../types/job.types';
import { VectorPoint } from '../../types/vector.types';
import { FileCleanupReason, ProcessingStatus } from '../../types/enums';
import { logger } from '../../utils/logger';
import { fileMetadataRepository } from '../../repositories/file-metadata.repository';
import { projectRepository } from '../../repositories/project.repository';
import { embeddingRepository } from '../../repositories/embedding.repository';
import { publishStorageUpdate, publishFileCleanup } from '../../utils/async-events.util';
import { getErrorMessage } from '../../types/error.types';
import { CONFIG } from '../../config';

export async function processIndexingJob(job: Job<IndexingJobData, JobResult>): Promise<JobResult> {
  const { companyId, fileId, filePath, mimetype, fileSizeMB, embeddingProvider, embeddingModel } =
    job.data;

  logger.info('Processing job started', {
    jobId: job.id,
    companyId,
    fileId,
    mimetype,
    fileSizeMB,
  });

  await job.updateProgress(10); // 10% - Starting

  try {
    // Fetch file metadata to get projectId
    const fileMetadata = await fileMetadataRepository.findById(fileId);
    if (!fileMetadata) {
      throw new Error('File metadata not found');
    }
    const projectId = fileMetadata.projectId;

    // Fetch project to get chunking settings
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Get chunking settings from project, with defaults
    const chunkSize = project.settings?.chunkSize ?? 1000;
    const chunkOverlap = project.settings?.chunkOverlap ?? 200;

    // Update file status to PROCESSING
    await fileMetadataRepository.updateProcessingStatus(fileId, ProcessingStatus.PROCESSING);

    // Clean up any existing embeddings for this file (e.g. re-indexing)
    await embeddingRepository.deleteByFileId(fileId);

    // 1. Extract
    logger.debug('Extracting text', { jobId: job.id, filePath });
    const rawText = await extractText(filePath, mimetype);

    // 2. Chunk with project settings
    logger.debug('Chunking text', { jobId: job.id, chunkSize, chunkOverlap });
    const chunks = chunkText(rawText, chunkSize, chunkOverlap);
    await job.updateProgress(30); // 30% - Text ready

    logger.info('Text extracted and chunked', {
      jobId: job.id,
      textLength: rawText.length,
      chunksCount: chunks.length,
    });

    if (chunks.length === 0) {
      const errorMessage = 'No text extracted from file';
      await fileMetadataRepository.updateProcessingStatus(
        fileId,
        ProcessingStatus.FAILED,
        errorMessage
      );
      throw new Error(errorMessage);
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

    const allVectors: number[][] = [];
    const allContents: string[] = [];

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

      // Embed the batch using specified provider or default
      const vectors = await VectorService.getEmbeddings(batchChunks, 'document', embeddingProvider);

      // Collect for MongoDB
      allVectors.push(...vectors);
      allContents.push(...batchChunks);

      // Map to Qdrant Points with Deterministic IDs
      const points: VectorPoint[] = batchChunks.map((chunk, idx) => {
        const globalIndex = start + idx;
        // Hash the content for idempotency
        const contentHash = generateContentHash(chunk);

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
      await VectorService.ensureCollection(collection, embeddingProvider);
      await VectorService.upsertBatch(collection, points);

      // Update job progress
      const progress = 30 + Math.floor(((i + 1) / totalBatches) * 70);
      await job.updateProgress(progress);
    }

    // Determine provider and model name
    const effectiveProvider: EmbeddingProvider =
      (embeddingProvider as EmbeddingProvider) ||
      (CONFIG.EMBEDDING_PROVIDER as EmbeddingProvider) ||
      (CONFIG.INHOUSE_EMBEDDINGS ? 'inhouse' : 'openai');
    const effectiveModelName = embeddingModel || VectorService.getModelName(effectiveProvider);
    const vectorDimensions = VectorService.getEmbeddingDimensions(effectiveProvider);

    // Save embeddings to MongoDB (Single Document per File)
    await embeddingRepository.create({
      fileId,
      projectId,
      chunkCount: chunks.length,
      contents: allContents,
      vectors: allVectors,
      provider: effectiveProvider,
      modelName: effectiveModelName,
      vectorDimensions,
      metadata: {
        characterCount: rawText.length,
      },
    });

    // Update vector indexing status
    const collection = `company_${companyId}`;
    await fileMetadataRepository.updateVectorIndexed(fileId, true, collection, chunks.length);
    await fileMetadataRepository.updateProcessingStatus(fileId, ProcessingStatus.COMPLETED);

    // One-line event publishing for storage update
    const meta = await fileMetadataRepository.findById(fileId);
    if (meta) {
      void publishStorageUpdate({ companyId, fileSize: meta.size });
    }

    // Update project stats (increment vector count)
    await projectRepository.updateStats(projectId, {
      vectorCount: chunks.length,
    });

    // One-line event publishing for file cleanup
    void publishFileCleanup({ filePath, reason: FileCleanupReason.CLEANUP });

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

    // Update file status to FAILED with error message and increment retry count
    const errorMessage = getErrorMessage(error) || 'Processing failed';
    await fileMetadataRepository.updateProcessingStatus(
      fileId,
      ProcessingStatus.FAILED,
      errorMessage
    );
    await fileMetadataRepository.incrementRetryCount(fileId, errorMessage);

    throw error;
  }
}
