import { Request, Response } from 'express';
import { indexingQueue } from '../queue/queue.client';
import { VectorService } from '../services/vector.service';
import { CacheService } from '../services/cache.service';
import { fileService } from '../services/file.service';
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
import { handleControllerError, sendNotFoundResponse } from '../utils/response.util';
import { QdrantFilter } from '../types/vector.types';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate company ID
    const { companyId } = companyIdSchema.parse(req.params);

    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Validate file
    fileUploadSchema.parse({ file: req.file });

    // Validate projectId is required
    const { projectId } = projectIdBodySchema.parse(req.body);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fileService.uploadFile(companyId, req.file as any, projectId, uploadedBy);

    res.status(202).json({
      message: 'File queued for indexing',
      jobId: result.jobId,
      fileId: result.fileId,
      statusUrl: `/v1/jobs/${result.jobId}`,
    });
  } catch (error) {
    handleControllerError(res, error, 'upload file');
  }
};

export const getJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    handleControllerError(res, error, 'get job status');
  }
};

export const searchCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = companyIdSchema.parse(req.params);
    const { query, limit, filter, rerank } = searchQuerySchema.parse(req.body);

    logger.info('Search requested', {
      companyId,
      query: query.substring(0, 100), // Log first 100 chars
      limit,
      hasFilter: !!filter,
      rerank,
    });

    // 1. Check Cache (include filter and rerank in cache key!)
    const cacheKey = CacheService.generateKey(companyId, query, limit, filter, rerank);
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
    let results;

    if (rerank) {
      results = await VectorService.searchWithReranking(collection, query, limit, qdrantFilter);
    } else {
      // Get embedding for the query
      const [queryVector] = await VectorService.getEmbeddings([query]);
      results = await VectorService.search(collection, queryVector, limit, qdrantFilter);
    }

    // 3. Cache the results
    await CacheService.set(cacheKey, results, 3600); // Cache for 1 hour

    logger.info('Search completed', {
      companyId,
      resultsCount: results.length,
      filtered: !!filter,
      rerank,
    });

    res.json({ results });
  } catch (error) {
    handleControllerError(res, error, 'search');
  }
};
