import { Worker } from 'bullmq';
import { CONFIG } from '../../config';
import { logger } from '../../utils/logger';
import { processAsyncTask } from './processor';

const worker = new Worker('async-tasks-queue', processAsyncTask, {
  connection: { host: CONFIG.REDIS_HOST, port: CONFIG.REDIS_PORT },
  concurrency: 10, // Process multiple tasks in parallel
});

worker.on('completed', (job) => {
  logger.debug('Async task completed', { jobId: job.id, taskType: job.data.taskType });
});

worker.on('failed', (job, err) => {
  logger.error('Async task failed', {
    jobId: job?.id,
    taskType: job?.data.taskType,
    error: err.message,
    stack: err.stack,
  });
});

worker.on('error', (err) => {
  logger.error('Async tasks worker error', { error: err.message, stack: err.stack });
});

logger.info('Async tasks worker started', { concurrency: 10, queue: 'async-tasks-queue' });

export default worker;

