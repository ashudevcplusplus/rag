import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { generateFileHash } from '../utils/hash.util';
import { extractText } from '../utils/text-processor';
import { indexingQueue } from '../queue/queue.client';
import { publishFileCleanup, publishProjectStats } from '../utils/async-events.util';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { companyRepository } from '../repositories/company.repository';
import { ProcessingStatus, FileCleanupReason, EventSource } from '@rag/types';
import { ValidationError } from '../types/error.types';
import { logger } from '../utils/logger';
import { CacheService } from './cache.service';

// Minimum text length to consider a file valid (in characters)
const MIN_TEXT_LENGTH = 10;

export class FileService {
  /**
   * Upload and queue file for indexing
   * @param embeddingProvider - Optional embedding provider override
   * @param embeddingModel - Optional embedding model override
   */
  async uploadFile(
    companyId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any,
    projectId: string,
    uploadedBy: string,
    embeddingProvider?: 'openai' | 'gemini',
    embeddingModel?: string
  ): Promise<{ fileId: string; jobId: string }> {
    // Check storage limit
    const hasReachedLimit = await companyRepository.hasReachedStorageLimit(companyId);
    if (hasReachedLimit) {
      const company = await companyRepository.findById(companyId);
      logger.warn('Storage limit reached', { companyId, storageUsed: company?.storageUsed });
      throw new ValidationError('Storage limit reached');
    }

    const fileId = uuidv4();

    // Calculate file hash for deduplication
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = generateFileHash(fileBuffer);

    // Check for duplicates
    const existingFile = await fileMetadataRepository.findByHash(fileHash, projectId);
    if (existingFile) {
      // Clean up the duplicate file immediately
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        logger.warn('Failed to cleanup duplicate file', { filePath: file.path, error });
      }

      // One-line event publishing
      void publishFileCleanup({
        source: EventSource.FILE_SERVICE_UPLOAD,
        filePath: file.path,
        reason: FileCleanupReason.DUPLICATE,
      });

      logger.info('Duplicate file detected', {
        companyId,
        projectId,
        hash: fileHash,
        existingFileId: existingFile._id,
      });

      throw new ValidationError('File already exists in project');
    }

    logger.info('File upload processing', {
      companyId,
      fileId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hash: fileHash,
      tags: [],
    });

    // Validate file has extractable text content BEFORE saving to database
    try {
      const extractedText = await extractText(file.path, file.mimetype);
      const trimmedText = extractedText?.trim() || '';

      if (trimmedText.length < MIN_TEXT_LENGTH) {
        // Clean up the file that has no extractable text
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup unextractable file', {
            filePath: file.path,
            cleanupError,
          });
        }

        void publishFileCleanup({
          source: EventSource.FILE_SERVICE_UPLOAD,
          filePath: file.path,
          reason: FileCleanupReason.ERROR,
        });

        logger.warn('File rejected: no extractable text content', {
          companyId,
          projectId,
          filename: file.originalname,
          mimetype: file.mimetype,
          textLength: trimmedText.length,
        });

        throw new ValidationError(
          'File has no extractable text content. This may be a scanned image PDF or an empty file. Please ensure the file contains readable text.'
        );
      }

      logger.debug('Text extraction validation passed', {
        filename: file.originalname,
        textLength: trimmedText.length,
      });
    } catch (extractError) {
      // If it's already a ValidationError, rethrow it
      if (extractError instanceof ValidationError) {
        throw extractError;
      }

      // Clean up the file on extraction error
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup file after extraction error', {
          filePath: file.path,
          cleanupError,
        });
      }

      void publishFileCleanup({
        source: EventSource.FILE_SERVICE_UPLOAD,
        filePath: file.path,
        reason: FileCleanupReason.ERROR,
      });

      logger.warn('File rejected: text extraction failed', {
        companyId,
        projectId,
        filename: file.originalname,
        mimetype: file.mimetype,
        error: extractError instanceof Error ? extractError.message : String(extractError),
      });

      throw new ValidationError(
        `Unable to extract text from file: ${extractError instanceof Error ? extractError.message : 'Unknown error'}. Please ensure the file is a valid document with readable text.`
      );
    }

    // Store file metadata in database (include embedding config for reindexing consistency)
    const fileMetadata = await fileMetadataRepository.create({
      projectId,
      uploadedBy,
      filename: file.filename,
      originalFilename: file.originalname,
      filepath: file.path,
      mimetype: file.mimetype,
      size: file.size,
      hash: fileHash,
      tags: [],
      embeddingProvider,
      embeddingModel,
    });

    // One-line event publishing for project stats (storage update happens after indexing completes)
    void publishProjectStats({
      source: EventSource.FILE_SERVICE_UPLOAD,
      projectId,
      fileCount: 1,
      totalSize: file.size,
    });

    // Add to Queue
    const job = await indexingQueue.add(
      'index-file',
      {
        companyId,
        fileId: fileMetadata._id,
        filePath: file.path,
        mimetype: file.mimetype,
        fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
        embeddingProvider,
        embeddingModel,
      },
      {
        attempts: 3, // Retry failed jobs 3 times
        backoff: { type: 'exponential', delay: 5000 },
      }
    );

    // Update file metadata with job ID
    await fileMetadataRepository.update(fileMetadata._id, {
      indexingJobId: job.id as string,
      processingStatus: ProcessingStatus.PENDING,
    });

    logger.info('File queued for indexing', {
      companyId,
      fileId: fileMetadata._id,
      jobId: job.id,
    });

    // OPTIMIZATION: Invalidate project files cache so new file is immediately searchable
    const projectFilesCacheKey = `project-files:${projectId}`;
    await CacheService.del(projectFilesCacheKey);

    return {
      fileId: fileMetadata._id,
      jobId: job.id as string,
    };
  }
}

export const fileService = new FileService();
