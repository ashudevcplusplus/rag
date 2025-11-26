import { Request, Response } from 'express';
import { z } from 'zod';
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
} from '../validators/upload.validator';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate company ID
    const { companyId } = companyIdSchema.parse(req.params);

    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Validate file
    fileUploadSchema.parse({ file: req.file });

    // TODO: Get projectId from request (for now using a default project approach)
    // In a full implementation, you'd require projectId as a parameter
    const projectId = req.body.projectId || companyId; // Temporary: use companyId as projectId
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
    if (error instanceof z.ZodError) {
      logger.warn('File upload validation failed', { issues: error.issues });
      res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
      return;
    }

    if (error instanceof ValidationError) {
      if (error.message === 'Storage limit reached') {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }

    logger.error('Failed to enqueue job', { error });
    throw error;
  }
};

export const getJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = jobIdSchema.parse(req.params);

    const job = await indexingQueue.getJob(jobId);
    if (!job) {
      logger.warn('Job not found', { jobId });
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const state = await job.getState();
    const progress = await job.progress;
    const result = job.returnvalue;
    const reason = job.failedReason;

    logger.debug('Job status retrieved', { jobId, state, progress });

    res.json({ id: job.id, state, progress, result, reason });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Job status validation failed', { issues: error.issues });
      res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
      return;
    }

    logger.error('Error getting job status', { error });
    throw error;
  }
};

export const searchCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = companyIdSchema.parse(req.params);
    const { query, limit, filter } = searchQuerySchema.parse(req.body);

    logger.info('Search requested', {
      companyId,
      query: query.substring(0, 100), // Log first 100 chars
      limit,
      hasFilter: !!filter,
    });

    // 1. Check Cache (include filter in cache key!)
    const cacheKey = CacheService.generateKey(companyId, query, limit, filter);
    const cachedResults = await CacheService.get(cacheKey);

    if (cachedResults) {
      res.setHeader('X-Cache', 'HIT');
      logger.info('Search served from cache', { companyId });
      res.json({ results: cachedResults });
      return;
    }

    // 2. Cache miss - perform search
    res.setHeader('X-Cache', 'MISS');

    // Get embedding for the query
    const [queryVector] = await VectorService.getEmbeddings([query]);

    // Build Qdrant filter from API filter
    let qdrantFilter = undefined;
    if (filter) {
      qdrantFilter = {
        must: [] as Array<{ key: string; match: { value: string | number | boolean } }>,
      };

      if (filter.fileId) {
        const fileIdValue = filter.fileId;
        // Ensure fileId is a valid type for Qdrant
        if (
          typeof fileIdValue === 'string' ||
          typeof fileIdValue === 'number' ||
          typeof fileIdValue === 'boolean'
        ) {
          qdrantFilter.must.push({
            key: 'fileId',
            match: { value: fileIdValue },
          });
        }
      }

      // Add more filter conditions as needed
      // Example: date range, mimetype, etc.
    }

    // Search in company collection
    const collection = `company_${companyId}`;
    const results = await VectorService.search(collection, queryVector, limit, qdrantFilter);

    // 3. Cache the results
    await CacheService.set(cacheKey, results, 3600); // Cache for 1 hour

    logger.info('Search completed', {
      companyId,
      resultsCount: results.length,
      filtered: !!filter,
    });

    res.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Search validation failed', { issues: error.issues });
      res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
      return;
    }

    logger.error('Search error', { error });
    throw error;
  }
};
