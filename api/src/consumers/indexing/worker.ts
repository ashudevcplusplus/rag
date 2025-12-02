import { Worker } from 'bullmq';
import { CONFIG } from '../../config';
import { IndexingJobData, JobResult } from '../../types/job.types';
import { logger } from '../../utils/logger';
import { processIndexingJob } from './processor';

const worker = new Worker<IndexingJobData, JobResult>('indexing-queue', processIndexingJob, {
  connection: { host: CONFIG.REDIS_HOST, port: CONFIG.REDIS_PORT },
  concurrency: 2, // Process 2 files in parallel
});

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
