import { Worker } from 'bullmq';
import { createWorker } from '../../utils/worker-factory';
import { processAsyncTask } from './processor';
import { taskQueues } from '../../queue/async-tasks.queue';
import { AsyncTaskType } from '@rag/types';

// Create workers for each task type dynamically
const workers: Record<AsyncTaskType, Worker> = {} as Record<AsyncTaskType, Worker>;

for (const [taskType] of Object.entries(taskQueues) as [
  AsyncTaskType,
  (typeof taskQueues)[AsyncTaskType],
][]) {
  const queueName = `${taskType}-queue`;
  workers[taskType] = createWorker(queueName, processAsyncTask, {
    concurrency: 10,
    logPrefix: `AsyncTask[${taskType}]`,
  });
}

// Export all workers as an array for easy iteration
export const allAsyncTaskWorkers = Object.values(workers);

// Helper function to close all workers
export async function closeAllWorkers(): Promise<void> {
  await Promise.all(allAsyncTaskWorkers.map((worker) => worker.close()));
}

// Export default for backward compatibility (returns first worker)
export default workers[AsyncTaskType.API_LOGGING];
