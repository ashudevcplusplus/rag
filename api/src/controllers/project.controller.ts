import { Request, Response } from 'express';
import { projectRepository } from '../repositories/project.repository';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { embeddingRepository } from '../repositories/embedding.repository';
import { DeletionService } from '../services/deletion.service';
import { VectorService } from '../services/vector.service';
import { indexingQueue } from '../queue/queue.client';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
} from '../schemas/project.schema';
import { logger } from '../utils/logger';
import { publishAnalytics } from '../utils/async-events.util';
import { AnalyticsEventType, ProcessingStatus, EventSource } from '../types/enums';
import {
  sendConflictResponse,
  sendNotFoundResponse,
  sendBadRequestResponse,
} from '../utils/response.util';
import { getCompanyId } from '../utils/request.util';
import { parsePaginationQuery, createPaginationResponse } from '../utils/pagination.util';
import { asyncHandler } from '../middleware/error.middleware';
import {
  ValidatedFileRequest,
  ValidatedProjectRequest,
} from '../middleware/project-file-access.middleware';

/**
 * Create a new project
 */
export const createProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const companyId = getCompanyId(req);
  if (!companyId) {
    sendBadRequestResponse(res, 'Company ID required');
    return;
  }

  // Parse and validate input
  const parsedData = createProjectSchema.parse({ ...req.body, companyId });

  // Set ownerId to companyId if not provided (fallback for API key based auth)
  const data = {
    ...parsedData,
    ownerId: parsedData.ownerId || companyId,
  };

  // Check if slug already exists within this company
  const existing = await projectRepository.findBySlug(companyId, data.slug);
  if (existing) {
    sendConflictResponse(res, 'Project with this slug already exists');
    return;
  }

  const project = await projectRepository.create(data);

  logger.info('Project created', { projectId: project._id, companyId, slug: project.slug });

  // One-line event publishing
  void publishAnalytics({
    source: EventSource.PROJECT_CONTROLLER_CREATE,
    eventType: AnalyticsEventType.PROJECT_CREATE,
    companyId,
    projectId: project._id,
    metadata: { slug: project.slug, name: project.name },
  });

  res.status(201).json({ project });
});

/**
 * Get project by ID
 * Optionally recalculates fresh stats from actual data (disabled by default for performance)
 * Pass ?syncStats=true to trigger stats recalculation
 */
export const getProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);

  const project = await projectRepository.findById(projectId);
  if (!project) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  // Only recalculate stats when explicitly requested (opt-in for performance)
  const syncStats = req.query.syncStats === 'true';
  if (syncStats) {
    await projectRepository.recalculateStats(projectId);
    // Refetch project with updated stats
    const updatedProject = await projectRepository.findById(projectId);
    if (updatedProject) {
      res.json({ project: updatedProject });
      return;
    }
  }

  res.json({ project });
});

/**
 * List projects in a company
 * Supports syncStats query param to calculate accurate stats from file metadata
 * Pass ?syncStats=true to trigger stats recalculation (disabled by default for performance)
 */
export const listProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const companyId = getCompanyId(req);
  if (!companyId) {
    sendBadRequestResponse(res, 'Company ID required');
    return;
  }

  const { page, limit } = parsePaginationQuery(req);
  const status = req.query.status as string;
  const ownerId = req.query.ownerId as string;
  const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
  // Opt-in stats sync for performance (expensive aggregation queries)
  const syncStats = req.query.syncStats === 'true';

  const result = await projectRepository.list(companyId, page, limit, {
    status,
    ownerId,
    tags,
    syncStats,
  });

  const response = createPaginationResponse(result.projects, result.page, limit, result.total);
  res.json({ projects: response.items, pagination: response.pagination });
});

/**
 * Update project
 */
export const updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);
  const data = updateProjectSchema.parse(req.body);

  const project = await projectRepository.update(projectId, data);
  if (!project) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  logger.info('Project updated', { projectId, updates: Object.keys(data) });

  // One-line event publishing
  const companyId = getCompanyId(req);
  if (companyId) {
    void publishAnalytics({
      source: EventSource.PROJECT_CONTROLLER_UPDATE,
      eventType: AnalyticsEventType.PROJECT_UPDATE,
      companyId,
      projectId,
      metadata: { updatedFields: Object.keys(data) },
    });
  }

  res.json({ project });
});

/**
 * Delete project (soft delete with cascade cleanup)
 */
export const deleteProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);

  const success = await DeletionService.deleteProject(projectId);
  if (!success) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  logger.info('Project deleted', { projectId });

  // One-line event publishing
  const companyId = getCompanyId(req);
  if (companyId) {
    void publishAnalytics({
      source: EventSource.PROJECT_CONTROLLER_DELETE,
      eventType: AnalyticsEventType.PROJECT_DELETE,
      companyId,
      projectId,
    });
  }

  res.json({ message: 'Project deleted successfully' });
});

/**
 * Archive/Unarchive project
 */
export const archiveProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);
  const { archive } = req.body;

  if (typeof archive !== 'boolean') {
    sendBadRequestResponse(res, 'archive must be a boolean');
    return;
  }

  const success = archive
    ? await projectRepository.archive(projectId)
    : await projectRepository.unarchive(projectId);

  if (!success) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  logger.info('Project archive status updated', { projectId, archived: archive });

  res.json({ message: `Project ${archive ? 'archived' : 'unarchived'} successfully` });
});

/**
 * Get project stats
 */
export const getProjectStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);

  const stats = await projectRepository.getStats(projectId);
  if (!stats) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  res.json({ stats });
});

/**
 * List files in a project
 */
export const listProjectFiles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);
  const { page, limit } = parsePaginationQuery(req);

  const project = await projectRepository.findById(projectId);
  if (!project) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  const result = await fileMetadataRepository.list(projectId, page, limit);

  const response = createPaginationResponse(result.files, result.page, limit, result.total);
  res.json({ files: response.items, pagination: response.pagination });
});

/**
 * Search projects
 */
export const searchProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const companyId = getCompanyId(req);
  if (!companyId) {
    sendBadRequestResponse(res, 'Company ID required');
    return;
  }

  const searchTerm = req.query.q as string;
  if (!searchTerm) {
    sendBadRequestResponse(res, 'Search term required');
    return;
  }

  const { page, limit } = parsePaginationQuery(req);

  const result = await projectRepository.search(companyId, searchTerm, page, limit);

  const response = createPaginationResponse(result.projects, result.page, limit, result.total);
  res.json({ projects: response.items, pagination: response.pagination });
});

/**
 * Get file preview/content
 * Note: validateFileAccess middleware must be applied before this handler
 */
export const getFilePreview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { validatedFile: file } = req as ValidatedFileRequest;

  // Get file content from embeddings
  const embedding = await embeddingRepository.findByFileId(file._id);

  if (!embedding || !embedding.contents || embedding.contents.length === 0) {
    // File exists but no content yet (still processing)
    res.json({
      file: {
        _id: file._id,
        originalFilename: file.originalFilename,
        mimeType: file.mimetype,
        size: file.size,
        chunkCount: file.chunkCount || 0,
        processingStatus: file.processingStatus,
      },
      content: null,
      chunks: [],
      message: 'File content not available yet. Processing may still be in progress.',
    });
    return;
  }

  // Return file metadata and content
  res.json({
    file: {
      _id: file._id,
      originalFilename: file.originalFilename,
      mimeType: file.mimetype,
      size: file.size,
      chunkCount: embedding.chunkCount,
      processingStatus: file.processingStatus,
    },
    content: embedding.contents.join('\n\n'),
    chunks: embedding.contents,
  });
});

/**
 * Delete file from project
 * Note: validateFileAccess middleware must be applied before this handler
 */
export const deleteFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { validatedFile: file, validatedCompanyId: companyId } = req as ValidatedFileRequest;
  const fileId = file._id;
  const projectId = file.projectId;

  // Delete file and associated data
  const success = await DeletionService.deleteFile(fileId);
  if (!success) {
    sendNotFoundResponse(res, 'File');
    return;
  }

  logger.info('File deleted', { fileId, projectId });

  // Publish analytics
  void publishAnalytics({
    source: EventSource.PROJECT_CONTROLLER_DELETE_FILE,
    eventType: AnalyticsEventType.FILE_DELETE,
    companyId,
    projectId,
    metadata: { fileId, filename: file.originalFilename },
  });

  res.json({ message: 'File deleted successfully' });
});

/**
 * Download file
 * Note: validateFileAccess middleware must be applied before this handler
 */
export const downloadFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { validatedFile: file } = req as ValidatedFileRequest;
  const fileId = file._id;

  // Check if file exists on disk
  const fs = await import('fs/promises');
  try {
    await fs.access(file.filepath);
  } catch {
    sendNotFoundResponse(res, 'File content');
    return;
  }

  // Update last accessed timestamp
  await fileMetadataRepository.updateLastAccessed(fileId);

  // Send file for download
  res.setHeader('Content-Type', file.mimetype);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.originalFilename)}"`
  );
  res.setHeader('Content-Length', file.size);

  const { createReadStream } = await import('fs');
  const stream = createReadStream(file.filepath);

  stream.on('error', (err) => {
    logger.error('File stream error during download', { fileId, error: err.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to read file' });
    } else {
      res.end();
    }
  });

  stream.pipe(res);
});

/**
 * Reindex/retry a file
 * Note: validateFileAccess middleware must be applied before this handler
 */
export const reindexFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { validatedFile: file, validatedCompanyId: companyId } = req as ValidatedFileRequest;
  const fileId = file._id;
  const projectId = file.projectId;

  // Check if file can be reindexed (FAILED, COMPLETED, or stuck PROCESSING)
  const allowedStatuses = [
    ProcessingStatus.FAILED,
    ProcessingStatus.COMPLETED,
    ProcessingStatus.PROCESSING, // Allow retry for stuck processing jobs
  ];
  if (!allowedStatuses.includes(file.processingStatus)) {
    sendBadRequestResponse(res, `Cannot reindex file with status: ${file.processingStatus}`);
    return;
  }

  // Check if file exists on disk
  const fs = await import('fs/promises');
  try {
    await fs.access(file.filepath);
  } catch {
    sendBadRequestResponse(res, 'File content no longer exists on disk');
    return;
  }

  // Reset file status BEFORE adding to queue to avoid race condition
  // (processor may pick up job and set PROCESSING before we update to PENDING)
  // Order: 1) Update status 2) Clear error 3) Delete embeddings
  // This ensures if embedding deletion fails, file is still in PENDING state
  await fileMetadataRepository.update(fileId, {
    processingStatus: ProcessingStatus.PENDING,
    chunkCount: 0,
    vectorIndexed: false,
    retryCount: 0,
  });
  await fileMetadataRepository.clearErrorMessage(fileId);

  // Delete existing embeddings and vectors in parallel after state is updated
  // If this fails, file is in PENDING state and processor will handle it
  const collection = `company_${companyId}`;
  await Promise.all([
    VectorService.deleteByFileId(collection, fileId),
    embeddingRepository.deleteByFileId(fileId),
  ]);

  // Add to indexing queue after status is set
  // Include original embedding config to ensure vector dimension consistency
  const job = await indexingQueue.add(
    'index-file',
    {
      companyId,
      fileId,
      filePath: file.filepath,
      mimetype: file.mimetype,
      fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
      embeddingProvider: file.embeddingProvider,
      embeddingModel: file.embeddingModel,
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );

  // Update with job ID after successful queue add
  await fileMetadataRepository.update(fileId, {
    indexingJobId: job.id as string,
  });

  logger.info('File queued for reindexing', { fileId, projectId, jobId: job.id });

  res.json({
    message: 'File queued for reindexing',
    jobId: job.id,
    fileId,
  });
});

/**
 * Get indexing stats for a project
 * Note: validateProjectAccess middleware must be applied before this handler
 */
export const getIndexingStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { validatedProject: project } = req as ValidatedProjectRequest;
  const projectId = project._id;

  // Get counts by processing status and timing stats in parallel
  const [pending, processing, completed, failed, timeStats] = await Promise.all([
    fileMetadataRepository.countByProcessingStatus(projectId, ProcessingStatus.PENDING),
    fileMetadataRepository.countByProcessingStatus(projectId, ProcessingStatus.PROCESSING),
    fileMetadataRepository.countByProcessingStatus(projectId, ProcessingStatus.COMPLETED),
    fileMetadataRepository.countByProcessingStatus(projectId, ProcessingStatus.FAILED),
    fileMetadataRepository.getIndexingTimeStats(projectId),
  ]);

  res.json({
    stats: {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
      // Indexing time metrics
      averageProcessingTimeMs: timeStats.averageTimeMs,
      minProcessingTimeMs: timeStats.minTimeMs,
      maxProcessingTimeMs: timeStats.maxTimeMs,
    },
  });
});

/**
 * Bulk reindex failed files in a project
 * Note: validateProjectAccess middleware must be applied before this handler
 */
export const bulkReindexFailed = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { validatedProject: project, validatedCompanyId: companyId } =
      req as ValidatedProjectRequest;
    const projectId = project._id;

    // Get all failed files
    const failedFiles = await fileMetadataRepository.findByProcessingStatus(
      projectId,
      ProcessingStatus.FAILED
    );

    if (failedFiles.length === 0) {
      res.json({ message: 'No failed files to reindex', queued: 0 });
      return;
    }

    const fs = await import('fs/promises');
    const results: { fileId: string; jobId: string }[] = [];
    const errors: { fileId: string; error: string }[] = [];

    for (const file of failedFiles) {
      // Check if file exists on disk
      try {
        await fs.access(file.filepath);
      } catch {
        errors.push({ fileId: file._id, error: 'File no longer exists on disk' });
        continue;
      }

      // Reset file status BEFORE adding to queue to avoid race condition
      // (processor may set PROCESSING before we update)
      // Order: 1) Update status 2) Clear error 3) Delete embeddings
      // This ensures if embedding deletion fails, file is still in PENDING state
      try {
        // Reset file status, retry count, and clear error message first
        await fileMetadataRepository.update(file._id, {
          processingStatus: ProcessingStatus.PENDING,
          chunkCount: 0,
          vectorIndexed: false,
          retryCount: 0,
        });
        await fileMetadataRepository.clearErrorMessage(file._id);

        // Delete existing embeddings and vectors in parallel after state is updated
        // If this fails, file is in PENDING state and processor will handle it
        const collection = `company_${companyId}`;
        await Promise.all([
          VectorService.deleteByFileId(collection, file._id),
          embeddingRepository.deleteByFileId(file._id),
        ]);
      } catch (_dbError) {
        errors.push({ fileId: file._id, error: 'Failed to reset file state' });
        continue;
      }

      // Add to indexing queue after status is set
      // Include original embedding config to ensure vector dimension consistency
      let job;
      try {
        job = await indexingQueue.add(
          'index-file',
          {
            companyId,
            fileId: file._id,
            filePath: file.filepath,
            mimetype: file.mimetype,
            fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
            embeddingProvider: file.embeddingProvider,
            embeddingModel: file.embeddingModel,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }
        );
      } catch (_queueError) {
        errors.push({ fileId: file._id, error: 'Failed to add to indexing queue' });
        continue;
      }

      // Update with job ID after successful queue add
      await fileMetadataRepository.update(file._id, {
        indexingJobId: job.id as string,
      });

      results.push({ fileId: file._id, jobId: job.id as string });
    }

    logger.info('Bulk reindex initiated', {
      projectId,
      queued: results.length,
      errors: errors.length,
    });

    res.json({
      message: `Queued ${results.length} files for reindexing`,
      queued: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  }
);
