import { Request, Response } from 'express';
import { indexingQueue } from '../queue/queue.client';
import { consistencyCheckQueue } from '../queue/consistency-check.queue';
import {
  publishCacheInvalidation,
  publishSearchCache,
  publishAnalytics,
} from '../utils/async-events.util';
import { VectorService } from '../services/vector.service';
import { CacheService } from '../services/cache.service';
import { fileService } from '../services/file.service';
import { ConsistencyCheckService } from '../services/consistency-check.service';
import { AnalyticsEventType, EventSource } from '@rag/types';
import { ValidationError } from '../types/error.types';
import { logger } from '../utils/logger';
import {
  companyIdSchema,
  fileUploadSchema,
  searchQuerySchema,
  jobIdSchema,
  projectIdBodySchema,
} from '../validators/upload.validator';
import { projectRepository } from '../repositories/project.repository';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { companyRepository } from '../repositories/company.repository';
import { consumerChangeRepository } from '../repositories/consumer-change.repository';
import { embeddingRepository } from '../repositories/embedding.repository';
import { sendNotFoundResponse } from '../utils/response.util';
import { QdrantFilter, SearchResult, SearchResultPayload } from '../types/vector.types';
import { asyncHandler } from '../middleware/error.middleware';

export const uploadFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate company ID
  const { companyId } = companyIdSchema.parse(req.params);

  // Support both single file (req.file) and multiple files (req.files)
  const files = req.files && Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];

  if (files.length === 0) {
    throw new ValidationError('No files uploaded');
  }

  // Validate projectId and optional embedding provider
  const { projectId, embeddingProvider, embeddingModel } = projectIdBodySchema.parse(req.body);

  // Verify project exists and belongs to the company
  const project = await projectRepository.findById(projectId);
  if (!project) {
    logger.warn('Project not found', { projectId, companyId });
    throw new ValidationError('Project not found');
  }

  // Compare company IDs (handle both string and ObjectId formats)
  const projectCompanyId = String(project.companyId);

  if (projectCompanyId !== companyId) {
    logger.warn('Project company mismatch', {
      projectId,
      projectCompanyId,
      requestedCompanyId: companyId,
    });
    throw new ValidationError('Project does not belong to this company');
  }

  const uploadedBy = req.body.uploadedBy || companyId; // Temporary: would come from authenticated user

  // Validate all files
  for (const file of files) {
    fileUploadSchema.parse({ file });
  }

  // Process all files
  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      const result = await fileService.uploadFile(
        companyId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        file as any,
        projectId,
        uploadedBy,
        embeddingProvider,
        embeddingModel
      );
      results.push({
        fileId: result.fileId,
        jobId: result.jobId,
        filename: file.originalname,
        statusUrl: `/v1/jobs/${result.jobId}`,
      });

      // One-line event publishing for each file
      void publishAnalytics({
        source: EventSource.COMPANY_CONTROLLER_UPLOAD,
        eventType: AnalyticsEventType.UPLOAD,
        companyId,
        projectId,
        metadata: {
          fileId: result.fileId,
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
      });
    } catch (error) {
      logger.error('File upload error', {
        companyId,
        projectId,
        filename: file.originalname,
        error: error instanceof Error ? error.message : String(error),
      });
      errors.push({
        filename: file.originalname,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }

  // One-line event publishing for cache invalidation
  if (results.length > 0) {
    void publishCacheInvalidation({ source: EventSource.COMPANY_CONTROLLER_UPLOAD, companyId });
  }

  // Return response based on results
  if (results.length === 0) {
    // All files failed
    res.status(400).json({
      message: 'All file uploads failed',
      errors,
    });
    return;
  }

  if (errors.length > 0) {
    // Some files succeeded, some failed
    res.status(207).json({
      message: 'Partial success',
      results,
      errors,
    });
    return;
  }

  // All files succeeded
  if (results.length === 1) {
    // Single file - return simple response for backward compatibility
    res.status(202).json({
      message: 'File queued for indexing',
      jobId: results[0].jobId,
      fileId: results[0].fileId,
      statusUrl: results[0].statusUrl,
    });
  } else {
    // Multiple files - return array response
    res.status(202).json({
      message: `${results.length} files queued for indexing`,
      results,
    });
  }
});

export const getJobStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { jobId } = jobIdSchema.parse(req.params);

  const job = await indexingQueue.getJob(jobId);
  if (!job) {
    logger.warn('Job not found', { jobId });
    sendNotFoundResponse(res, 'Job');
    return;
  }

  const state = await job.getState();
  const progress = await job.progress;
  const result = job.returnvalue;
  const reason = job.failedReason;

  logger.debug('Job status retrieved', { jobId, state, progress });

  res.json({ id: job.id, state, progress, result, reason });
});

/**
 * Search company's vector store with multi-layer security
 *
 * Security layers:
 * 1. Collection scoping: company_${companyId}
 * 2. Qdrant filter: companyId + fileId (defense-in-depth)
 * 3. Project validation: ensures project belongs to company (when projectId filter provided)
 *
 * Supports filtering by projectId, fileId, fileIds
 */
export const searchCompany = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = companyIdSchema.parse(req.params);
  const { query, limit, filter, rerank, embeddingProvider } = searchQuerySchema.parse(req.body);

  logger.info('Search requested', {
    companyId,
    query: query.substring(0, 100), // Log first 100 chars
    limit,
    hasFilter: !!filter,
    rerank,
    embeddingProvider,
  });

  // 1. Check Cache (include filter, rerank, and provider in cache key!)
  const cacheKey = CacheService.generateKey(
    companyId,
    query,
    limit,
    filter,
    rerank,
    embeddingProvider
  );
  const cachedResults = await CacheService.get(cacheKey);

  if (cachedResults) {
    res.setHeader('X-Cache', 'HIT');
    logger.info('Search served from cache', { companyId });
    res.json({ results: cachedResults });
    return;
  }

  // 2. Cache miss - perform search
  res.setHeader('X-Cache', 'MISS');

  // Build Qdrant filter from API filter
  let qdrantFilter: QdrantFilter | undefined = undefined;
  if (filter) {
    let allowedFileIds: string[] | undefined = undefined;

    // Handle projectId filter - fetch all file IDs for the project
    if (filter.projectId && typeof filter.projectId === 'string') {
      // Verify project belongs to this company
      const project = await projectRepository.findById(filter.projectId);
      if (!project) {
        logger.warn('Project not found for search filter', {
          projectId: filter.projectId,
          companyId,
        });
        res.json({ results: [] });
        return;
      }

      if (String(project.companyId) !== companyId) {
        logger.warn('Project does not belong to company', {
          projectId: filter.projectId,
          projectCompanyId: project.companyId,
          requestedCompanyId: companyId,
        });
        res.json({ results: [] }); // Return empty instead of error to avoid leaking info
        return;
      }

      const projectFiles = await fileMetadataRepository.findByProjectId(filter.projectId);
      allowedFileIds = projectFiles.map((f) => f._id);

      if (allowedFileIds.length === 0) {
        logger.debug('No files found for project', { projectId: filter.projectId });
        res.json({ results: [] });
        return;
      }

      logger.debug('Filtering search by project files', {
        projectId: filter.projectId,
        fileCount: allowedFileIds.length,
      });
    }

    // Handle fileId filter - intersect with project files if both specified
    if (filter.fileId && typeof filter.fileId === 'string') {
      if (allowedFileIds) {
        // Intersect: only allow if file is in project
        if (!allowedFileIds.includes(filter.fileId)) {
          logger.debug('FileId not in project, returning empty', {
            fileId: filter.fileId,
            projectId: filter.projectId,
          });
          res.json({ results: [] });
          return;
        }
        allowedFileIds = [filter.fileId];
      } else {
        allowedFileIds = [filter.fileId];
      }
    }

    // Handle fileIds filter - intersect with project files if both specified
    if (filter.fileIds && Array.isArray(filter.fileIds) && filter.fileIds.length > 0) {
      const filterFileIds = filter.fileIds.filter((id): id is string => typeof id === 'string');

      // If all fileIds were invalid (non-string), return empty results
      if (filterFileIds.length === 0) {
        logger.debug('No valid string fileIds provided', {
          originalCount: filter.fileIds.length,
        });
        res.json({ results: [] });
        return;
      }

      if (allowedFileIds) {
        // Intersect: only keep files that are in both lists
        const fileIdsSet = new Set(filterFileIds);
        allowedFileIds = allowedFileIds.filter((id) => fileIdsSet.has(id));
        if (allowedFileIds.length === 0) {
          logger.debug('No intersection between fileIds and project files', {
            projectId: filter.projectId,
          });
          res.json({ results: [] });
          return;
        }
      } else {
        allowedFileIds = filterFileIds;
      }
    }

    // Build the final filter with defense-in-depth companyId check
    if (allowedFileIds && allowedFileIds.length > 0) {
      qdrantFilter = {
        must: [
          {
            key: 'companyId',
            match: { value: companyId },
          },
          {
            key: 'fileId',
            match:
              allowedFileIds.length === 1 ? { value: allowedFileIds[0] } : { any: allowedFileIds },
          },
        ],
      };
    }
  }

  // Search in company collection
  const collection = `company_${companyId}`;
  let results: SearchResult[];

  if (rerank) {
    results = await VectorService.searchWithReranking(
      collection,
      query,
      limit,
      qdrantFilter,
      20,
      embeddingProvider
    );
  } else {
    // Get embedding for the query (use 'query' task type for better search quality)
    const [queryVector] = await VectorService.getEmbeddings([query], 'query', embeddingProvider);
    results = await VectorService.search(collection, queryVector, limit, qdrantFilter);
  }

  // 3. Enrich results with file and project metadata
  if (results.length > 0) {
    try {
      // Collect unique file IDs
      const fileIds = [
        ...new Set(
          results
            .map((r) => {
              const payload = r.payload as SearchResultPayload | null;
              return payload?.fileId;
            })
            .filter((id): id is string => !!id)
        ),
      ];

      if (fileIds.length > 0) {
        // Fetch file metadata for all files
        const files = await fileMetadataRepository.findByIds(fileIds);
        const fileMap = new Map(files.map((f) => [f._id, f]));

        // Collect unique project IDs
        const projectIds = [
          ...new Set(files.map((f) => f.projectId).filter((id): id is string => !!id)),
        ];

        // Fetch project metadata for all projects
        const projects = await Promise.all(projectIds.map((id) => projectRepository.findById(id)));
        const projectMap = new Map(
          projects.filter((p): p is NonNullable<typeof p> => !!p).map((p) => [p._id, p])
        );

        // Enrich each result with metadata and filter out orphaned vectors
        // (vectors that exist in Qdrant but don't have file metadata in DB)
        const enrichedResults: SearchResult[] = [];

        for (const result of results) {
          const payload = result.payload as SearchResultPayload | null;
          if (!payload?.fileId) {
            // Skip results without fileId
            continue;
          }

          const file = fileMap.get(payload.fileId);
          if (!file) {
            // Log orphaned vector for cleanup tracking
            logger.debug('Orphaned vector found in search results', {
              companyId,
              fileId: payload.fileId,
              chunkIndex: payload.chunkIndex,
            });
            // Skip orphaned vectors (no file metadata in DB)
            continue;
          }

          const project = file.projectId ? projectMap.get(file.projectId) : null;

          // Create enriched payload
          // Add 'text' as alias for 'content' for frontend compatibility
          const enrichedPayload: SearchResultPayload = {
            ...payload,
            projectId: file.projectId || undefined,
            projectName: project?.name || undefined,
            fileName: file.filename || undefined,
            originalFilename: file.originalFilename || undefined,
            totalChunks: file.chunkCount || undefined,
            // Add text alias for content if content exists
            ...(payload.content ? { text: payload.content } : {}),
          };

          enrichedResults.push({
            ...result,
            payload: enrichedPayload,
          });
        }

        results = enrichedResults;
      }
    } catch (error) {
      logger.warn('Failed to enrich search results with metadata', {
        error,
        companyId,
        resultsCount: results.length,
      });
      // Continue without enrichment rather than failing the request
    }
  }

  // 4. One-line event publishing
  void publishSearchCache({
    source: EventSource.COMPANY_CONTROLLER_SEARCH,
    cacheKey,
    results,
    ttl: 3600,
  });
  void publishAnalytics({
    source: EventSource.COMPANY_CONTROLLER_SEARCH,
    eventType: AnalyticsEventType.SEARCH,
    companyId,
    metadata: {
      queryLength: query.length,
      limit,
      hasFilter: !!filter,
      rerank,
      resultsCount: results.length,
    },
  });

  logger.info('Search completed', {
    companyId,
    resultsCount: results.length,
    filtered: !!filter,
    rerank,
  });

  res.json({ results });
});

/**
 * Helper to handle consistency job requests
 * Validates company if provided and publishes the job
 */
async function handleConsistencyJob(
  req: Request,
  res: Response,
  jobName: string,
  publishFn: (companyId?: string) => Promise<string>
): Promise<void> {
  const { companyId } = req.params;

  // If companyId is provided, validate it exists
  if (companyId) {
    const company = await companyRepository.findById(companyId);
    if (!company) {
      logger.warn(`Company not found for ${jobName}`, { companyId });
      sendNotFoundResponse(res, 'Company');
      return;
    }
  }

  // Publish event
  const jobId = await publishFn(companyId || undefined);

  logger.info(`${jobName} event published`, {
    jobId,
    companyId: companyId || 'all',
  });

  res.status(202).json({
    message: `${jobName} event published`,
    jobId,
    companyId: companyId || 'all',
    statusUrl: `/v1/jobs/consistency/${jobId}`,
  });
}

export const triggerConsistencyCheck = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await handleConsistencyJob(
      req,
      res,
      'Consistency check',
      ConsistencyCheckService.publishConsistencyCheck
    );
  }
);

export const getConsistencyCheckJobStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { jobId } = jobIdSchema.parse(req.params);

    const job = await consistencyCheckQueue.getJob(jobId);
    if (!job) {
      logger.warn('Consistency check job not found', { jobId });
      sendNotFoundResponse(res, 'Job');
      return;
    }

    const state = await job.getState();
    const progress = await job.progress;
    const result = job.returnvalue;
    const reason = job.failedReason;

    logger.debug('Consistency check job status retrieved', { jobId, state, progress });

    res.json({ id: job.id, state, progress, result, reason });
  }
);

export const clearCache = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = req.params;

  if (companyId) {
    // Clear cache for specific company
    const keysDeleted = await CacheService.clearCompany(companyId);
    logger.info('Cache cleared for company', { companyId, keysDeleted });
    res.json({
      message: 'Cache cleared for company',
      companyId,
      keysDeleted,
    });
  } else {
    // Clear all cache
    const keysDeleted = await CacheService.clearAll();
    logger.info('All cache cleared', { keysDeleted });
    res.json({
      message: 'All cache cleared',
      keysDeleted,
    });
  }
});

export const cleanupOrphanedVectors = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await handleConsistencyJob(
      req,
      res,
      'Cleanup orphaned vectors',
      ConsistencyCheckService.publishCleanupOrphaned
    );
  }
);

export const checkAndFix = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await handleConsistencyJob(req, res, 'Check and fix', ConsistencyCheckService.publishCheckAndFix);
});

export const getConsumerChanges = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters: {
      eventType?: string;
      status?: string;
      companyId?: string;
    } = {};

    if (req.query.eventType) {
      filters.eventType = req.query.eventType as string;
    }
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    if (companyId) {
      filters.companyId = companyId;
    }

    const result = await consumerChangeRepository.list(page, limit, filters);

    res.json(result);
  }
);

export const getConsumerChangeStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = req.params;

    const stats = await consumerChangeRepository.getStats(companyId);

    res.json(stats);
  }
);

export const getCompanyVectors = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get all projects for the company
    const projects = await projectRepository.findByCompanyId(companyId);
    const projectIds = projects.map((p) => p._id);

    if (projectIds.length === 0) {
      res.json({
        embeddings: [],
        total: 0,
        page,
        totalPages: 0,
      });
      return;
    }

    const result = await embeddingRepository.findByProjectIds(projectIds, page, limit);

    res.json(result);
  }
);

export const getCompanyStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = companyIdSchema.parse(req.params);

  const stats = await companyRepository.getStats(companyId);

  if (!stats) {
    sendNotFoundResponse(res, 'Company');
    return;
  }

  res.json(stats);
});

/**
 * Get company details
 */
export const getCompany = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = companyIdSchema.parse(req.params);

  const company = await companyRepository.findById(companyId);

  if (!company) {
    sendNotFoundResponse(res, 'Company');
    return;
  }

  // Remove sensitive fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apiKey, apiKeyHash, ...safeCompany } = company;

  res.json({ company: safeCompany });
});
