import { Worker } from 'bullmq';
import { CONFIG } from '../../config';
import { logger } from '../../utils/logger';
import { processConsistencyCheckJob, ConsumerJobData, ConsumerJobResult } from './processor';

const worker = new Worker<ConsumerJobData, ConsumerJobResult>(
  'consistency-check-queue',
  processConsistencyCheckJob,
  {
    connection: { host: CONFIG.REDIS_HOST, port: CONFIG.REDIS_PORT },
    concurrency: 1, // Process one job at a time to avoid overloading
  }
);

// Log worker events
worker.on('completed', (job) => {
  logger.info('Consumer worker completed job', { jobId: job.id, jobName: job.name });
});

worker.on('failed', (job, err) => {
  logger.error('Consumer worker failed job', {
    jobId: job?.id,
    jobName: job?.name,
    error: err.message,
    stack: err.stack,
  });
});

worker.on('error', (err) => {
  logger.error('Consumer worker error', { error: err.message, stack: err.stack });
});

logger.info('Consumer worker started', {
  concurrency: 1,
  queue: 'consistency-check-queue',
  supportedJobs: ['consistency-check', 'cleanup-orphaned', 'check-and-fix'],
});

export default worker;
