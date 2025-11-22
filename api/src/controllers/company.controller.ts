import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { indexingQueue } from '../queue/queue.client';
import { VectorService } from '../services/vector.service';
import { CacheService } from '../services/cache.service';
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
    const { file } = fileUploadSchema.parse({ file: req.file });

    const fileId = uuidv4();

    logger.info('File upload requested', {
      companyId,
      fileId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Add to Queue
    const job = await indexingQueue.add(
      'index-file',
      {
        companyId,
        fileId,
        filePath: req.file.path,
        mimetype: req.file.mimetype,
      },
      {
        attempts: 3, // Retry failed jobs 3 times
        backoff: { type: 'exponential', delay: 5000 },
      }
    );

    logger.info('File queued for indexing', {
      companyId,
      fileId,
      jobId: job.id,
    });

    res.status(202).json({
      message: 'File queued for indexing',
      jobId: job.id,
      fileId,
      statusUrl: `/v1/jobs/${job.id}`,
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
