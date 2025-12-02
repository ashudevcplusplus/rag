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
import { AnalyticsEventType } from '../types/enums';
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
    void publishCacheInvalidation({ companyId });
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
    qdrantFilter = {
      must: [],
    };

    if (filter.fileId) {
      const fileIdValue = filter.fileId;
      // Ensure fileId is a valid type for Qdrant
      if (
        typeof fileIdValue === 'string' ||
        typeof fileIdValue === 'number' ||
        typeof fileIdValue === 'boolean'
      ) {
        qdrantFilter.must!.push({
          key: 'fileId',
          match: { value: fileIdValue },
        });
      }
    }

    if (filter.fileIds && Array.isArray(filter.fileIds)) {
      qdrantFilter.must!.push({
        key: 'fileId',
        match: { any: filter.fileIds },
      });
    }

    // Add more filter conditions as needed
    // Example: date range, mimetype, etc.
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
  void publishSearchCache({ cacheKey, results, ttl: 3600 });
  void publishAnalytics({
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

export const triggerConsistencyCheck = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = req.params;

    // If companyId is provided, validate it exists
    if (companyId) {
      const { companyRepository } = await import('../repositories/company.repository');
      const company = await companyRepository.findById(companyId);
      if (!company) {
        logger.warn('Company not found for consistency check', { companyId });
        sendNotFoundResponse(res, 'Company');
        return;
      }
    }

    // Publish event
    const { ConsistencyCheckService } = await import('../services/consistency-check.service');
    const jobId = await ConsistencyCheckService.publishConsistencyCheck(companyId || undefined);

    logger.info('Consistency check event published', {
      jobId,
      companyId: companyId || 'all',
    });

    res.status(202).json({
      message: 'Consistency check event published',
      jobId,
      companyId: companyId || 'all',
      statusUrl: `/v1/jobs/consistency/${jobId}`,
    });
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
    const { companyId } = req.params;

    // If companyId is provided, validate it exists
    if (companyId) {
      const { companyRepository } = await import('../repositories/company.repository');
      const company = await companyRepository.findById(companyId);
      if (!company) {
        logger.warn('Company not found for cleanup', { companyId });
        sendNotFoundResponse(res, 'Company');
        return;
      }
    }

    // Publish event
    const { ConsistencyCheckService } = await import('../services/consistency-check.service');
    const jobId = await ConsistencyCheckService.publishCleanupOrphaned(companyId || undefined);

    logger.info('Cleanup orphaned vectors event published', {
      jobId,
      companyId: companyId || 'all',
    });

    res.status(202).json({
      message: 'Cleanup orphaned vectors event published',
      jobId,
      companyId: companyId || 'all',
      statusUrl: `/v1/jobs/consistency/${jobId}`,
    });
  }
);

export const checkAndFix = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = req.params;

  // If companyId is provided, validate it exists
  if (companyId) {
    const { companyRepository } = await import('../repositories/company.repository');
    const company = await companyRepository.findById(companyId);
    if (!company) {
      logger.warn('Company not found for check and fix', { companyId });
      sendNotFoundResponse(res, 'Company');
      return;
    }
  }

  // Publish event
  const { ConsistencyCheckService } = await import('../services/consistency-check.service');
  const jobId = await ConsistencyCheckService.publishCheckAndFix(companyId || undefined);

  logger.info('Check and fix event published', {
    jobId,
    companyId: companyId || 'all',
  });

  res.status(202).json({
    message: 'Check and fix event published',
    jobId,
    companyId: companyId || 'all',
    statusUrl: `/v1/jobs/consistency/${jobId}`,
  });
});

export const getConsumerChanges = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const { consumerChangeRepository } = await import('../repositories/consumer-change.repository');

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

    const { consumerChangeRepository } = await import('../repositories/consumer-change.repository');

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

    const { embeddingRepository } = await import('../repositories/embedding.repository');
    const result = await embeddingRepository.findByProjectIds(projectIds, page, limit);

    res.json(result);
  }
);
