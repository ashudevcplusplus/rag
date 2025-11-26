import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import { indexingQueue } from '../queue/queue.client';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { companyRepository } from '../repositories/company.repository';
import { ProcessingStatus } from '../schemas/file-metadata.schema';
import { ValidationError } from '../types/error.types';
import { logger } from '../utils/logger';

export class FileService {
  /**
   * Upload and queue file for indexing
   */
  async uploadFile(
    companyId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any,
    projectId: string,
    uploadedBy: string
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
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    logger.info('File upload processing', {
      companyId,
      fileId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hash: fileHash,
      tags: [],
    });

    // Store file metadata in database
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
    });

    // Add to Queue
    const job = await indexingQueue.add(
      'index-file',
      {
        companyId,
        fileId: fileMetadata._id,
        filePath: file.path,
        mimetype: file.mimetype,
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

    return {
      fileId: fileMetadata._id,
      jobId: job.id as string,
    };
  }
}

export const fileService = new FileService();
