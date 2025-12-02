import { asyncTasksQueue } from '../queue/async-tasks.queue';
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
import { AsyncTaskType } from '../types/enums';

// Default job options
const DEFAULT_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
};

// Utility function to publish events with error handling
async function publishEvent<T extends object>(
  taskType: string,
  data: T,
  opts = DEFAULT_OPTS
): Promise<void> {
  try {
    await asyncTasksQueue.add(taskType, { taskType, ...data }, opts);
  } catch (err) {
    logger.error('Failed to publish event', {
      taskType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// One-line utility functions for publishing events
export const publishApiLog = (data: ApiLoggingJobData) => publishEvent(AsyncTaskType.API_LOGGING, data);

export const publishFileCleanup = (data: FileCleanupJobData) =>
  publishEvent(AsyncTaskType.FILE_CLEANUP, data, { attempts: 2, backoff: { type: 'exponential', delay: 1000 } });

export const publishCacheInvalidation = (data: CacheInvalidationJobData) =>
  publishEvent(AsyncTaskType.CACHE_INVALIDATION, data, { attempts: 2, backoff: { type: 'exponential', delay: 1000 } });

export const publishErrorLog = (data: ErrorLoggingJobData) => publishEvent(AsyncTaskType.ERROR_LOGGING, data);

export const publishSearchCache = (data: SearchCachingJobData) =>
  publishEvent(AsyncTaskType.SEARCH_CACHING, data, { attempts: 2, backoff: { type: 'exponential', delay: 1000 } });

export const publishApiKeyTracking = (data: ApiKeyTrackingJobData) =>
  publishEvent(AsyncTaskType.API_KEY_TRACKING, data, { attempts: 2, backoff: { type: 'exponential', delay: 1000 } });

export const publishAnalytics = (data: AnalyticsJobData) =>
  publishEvent(AsyncTaskType.ANALYTICS, data, { attempts: 2, backoff: { type: 'exponential', delay: 1000 } });

export const publishProjectStats = (data: ProjectStatsJobData) => publishEvent(AsyncTaskType.PROJECT_STATS, data);

export const publishWebhook = (data: WebhooksJobData) =>
  publishEvent(AsyncTaskType.WEBHOOKS, data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

export const publishStorageUpdate = (data: StorageUpdatesJobData) => publishEvent(AsyncTaskType.STORAGE_UPDATES, data);

