import { Worker } from 'bullmq';
import { CONFIG } from '../../config';
import { logger } from '../../utils/logger';
import { processAsyncTask } from './processor';
import { taskQueues } from '../../queue/async-tasks.queue';
import { AsyncTaskType } from '../../types/enums';

// Factory function to create a worker for a specific queue
function createWorker(taskType: AsyncTaskType, queueName: string): Worker {
  const worker = new Worker(queueName, processAsyncTask, {
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
    logger.error('Async tasks worker error', {
      taskType,
      error: err.message,
      stack: err.stack,
    });
  });

  logger.info('Async tasks worker started', { taskType, concurrency: 10, queue: queueName });

  return worker;
}

// Create workers for each task type dynamically
const workers: Record<AsyncTaskType, Worker> = {} as Record<AsyncTaskType, Worker>;
for (const [taskType] of Object.entries(taskQueues) as [
  AsyncTaskType,
  (typeof taskQueues)[AsyncTaskType],
][]) {
  const queueName = `${taskType}-queue`;
  workers[taskType] = createWorker(taskType, queueName);
}

// Export all workers as an array for easy iteration
export const allAsyncTaskWorkers = Object.values(workers);

// Helper function to close all workers
export async function closeAllWorkers(): Promise<void> {
  await Promise.all(allAsyncTaskWorkers.map((worker) => worker.close()));
}

// Export default for backward compatibility (returns first worker)
export default workers[AsyncTaskType.API_LOGGING];
