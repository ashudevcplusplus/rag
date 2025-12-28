import { taskQueues } from '../queue/async-tasks.queue';
import { logger } from '../utils/logger';
import type {
  ApiLoggingJobData,
  FileCleanupJobData,
  CacheInvalidationJobData,
  ErrorLoggingJobData,
  SearchCachingJobData,
  ApiKeyTrackingJobData,
  AnalyticsJobData,
  ProjectStatsJobData,
  WebhooksJobData,
  StorageUpdatesJobData,
} from '../types/events.types';
import { AsyncTaskType } from '@rag/types';

// Default job options
const DEFAULT_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
};

// Utility function to publish events with error handling
async function publishEvent<T extends object>(
  taskType: AsyncTaskType,
  data: T,
  opts = DEFAULT_OPTS
): Promise<void> {
  try {
    const queue = taskQueues[taskType];
    await queue.add(taskType, { taskType, ...data }, opts);
  } catch (err) {
    logger.error('Failed to publish event', {
      taskType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// One-line utility functions for publishing events
export const publishApiLog = (data: ApiLoggingJobData): Promise<void> =>
  publishEvent(AsyncTaskType.API_LOGGING, data);

export const publishFileCleanup = (data: FileCleanupJobData): Promise<void> =>
  publishEvent(AsyncTaskType.FILE_CLEANUP, data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
  });

export const publishCacheInvalidation = (data: CacheInvalidationJobData): Promise<void> =>
  publishEvent(AsyncTaskType.CACHE_INVALIDATION, data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
  });

export const publishErrorLog = (data: ErrorLoggingJobData): Promise<void> =>
  publishEvent(AsyncTaskType.ERROR_LOGGING, data);

export const publishSearchCache = (data: SearchCachingJobData): Promise<void> =>
  publishEvent(AsyncTaskType.SEARCH_CACHING, data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
  });

export const publishApiKeyTracking = (data: ApiKeyTrackingJobData): Promise<void> =>
  publishEvent(AsyncTaskType.API_KEY_TRACKING, data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
  });

export const publishAnalytics = (data: AnalyticsJobData): Promise<void> =>
  publishEvent(AsyncTaskType.ANALYTICS, data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
  });

export const publishProjectStats = (data: ProjectStatsJobData): Promise<void> =>
  publishEvent(AsyncTaskType.PROJECT_STATS, data);

export const publishWebhook = (data: WebhooksJobData): Promise<void> =>
  publishEvent(AsyncTaskType.WEBHOOKS, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });

export const publishStorageUpdate = (data: StorageUpdatesJobData): Promise<void> =>
  publishEvent(AsyncTaskType.STORAGE_UPDATES, data);
