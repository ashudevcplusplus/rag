import { Queue } from 'bullmq';
import { CONFIG } from '../config';
import { AsyncTaskType } from '../types/enums';

// Factory function to create queues
function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: {
      host: CONFIG.REDIS_HOST,
      port: CONFIG.REDIS_PORT,
    },
  });
}

// Individual queues for each task type
export const apiLoggingQueue = createQueue(`${AsyncTaskType.API_LOGGING}-queue`);
export const fileCleanupQueue = createQueue(`${AsyncTaskType.FILE_CLEANUP}-queue`);
export const cacheInvalidationQueue = createQueue(`${AsyncTaskType.CACHE_INVALIDATION}-queue`);
export const errorLoggingQueue = createQueue(`${AsyncTaskType.ERROR_LOGGING}-queue`);
export const searchCachingQueue = createQueue(`${AsyncTaskType.SEARCH_CACHING}-queue`);
export const apiKeyTrackingQueue = createQueue(`${AsyncTaskType.API_KEY_TRACKING}-queue`);
export const analyticsQueue = createQueue(`${AsyncTaskType.ANALYTICS}-queue`);
export const projectStatsQueue = createQueue(`${AsyncTaskType.PROJECT_STATS}-queue`);
export const webhooksQueue = createQueue(`${AsyncTaskType.WEBHOOKS}-queue`);
export const storageUpdatesQueue = createQueue(`${AsyncTaskType.STORAGE_UPDATES}-queue`);

// Map task types to their queues
export const taskQueues: Record<AsyncTaskType, Queue> = {
  [AsyncTaskType.API_LOGGING]: apiLoggingQueue,
  [AsyncTaskType.FILE_CLEANUP]: fileCleanupQueue,
  [AsyncTaskType.CACHE_INVALIDATION]: cacheInvalidationQueue,
  [AsyncTaskType.ERROR_LOGGING]: errorLoggingQueue,
  [AsyncTaskType.SEARCH_CACHING]: searchCachingQueue,
  [AsyncTaskType.API_KEY_TRACKING]: apiKeyTrackingQueue,
  [AsyncTaskType.ANALYTICS]: analyticsQueue,
  [AsyncTaskType.PROJECT_STATS]: projectStatsQueue,
  [AsyncTaskType.WEBHOOKS]: webhooksQueue,
  [AsyncTaskType.STORAGE_UPDATES]: storageUpdatesQueue,
};

// Export all queues as an array for easy iteration
export const allAsyncTaskQueues = Object.values(taskQueues);

// Export for backward compatibility
export { indexingQueue } from './queue.client';
export { consistencyCheckQueue } from './consistency-check.queue';
