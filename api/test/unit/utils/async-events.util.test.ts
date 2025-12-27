import {
  AsyncTaskType,
  AnalyticsEventType,
  FileCleanupReason,
  EventSource,
} from '../../../src/types/enums';

// Mock the queue before importing the module
const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockQueue = { add: mockAdd };

jest.mock('../../../src/queue/async-tasks.queue', () => ({
  taskQueues: {
    [AsyncTaskType.API_LOGGING]: mockQueue,
    [AsyncTaskType.FILE_CLEANUP]: mockQueue,
    [AsyncTaskType.CACHE_INVALIDATION]: mockQueue,
    [AsyncTaskType.ERROR_LOGGING]: mockQueue,
    [AsyncTaskType.SEARCH_CACHING]: mockQueue,
    [AsyncTaskType.API_KEY_TRACKING]: mockQueue,
    [AsyncTaskType.ANALYTICS]: mockQueue,
    [AsyncTaskType.PROJECT_STATS]: mockQueue,
    [AsyncTaskType.WEBHOOKS]: mockQueue,
    [AsyncTaskType.STORAGE_UPDATES]: mockQueue,
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  publishApiLog,
  publishFileCleanup,
  publishCacheInvalidation,
  publishErrorLog,
  publishSearchCache,
  publishApiKeyTracking,
  publishAnalytics,
  publishProjectStats,
  publishWebhook,
  publishStorageUpdate,
} from '../../../src/utils/async-events.util';
import { logger } from '../../../src/utils/logger';

describe('async-events.util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publishApiLog', () => {
    it('should publish API log event', async () => {
      const data = {
        source: EventSource.API_LOGGING_MIDDLEWARE,
        companyId: 'company-123',
        method: 'GET',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 100,
        ipAddress: '127.0.0.1',
      };

      await publishApiLog(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.API_LOGGING,
        expect.objectContaining({
          taskType: AsyncTaskType.API_LOGGING,
          ...data,
        }),
        expect.any(Object)
      );
    });
  });

  describe('publishFileCleanup', () => {
    it('should publish file cleanup event with custom options', async () => {
      const data = {
        source: EventSource.FILE_SERVICE_UPLOAD,
        filePath: '/path/to/file',
        reason: FileCleanupReason.CLEANUP,
      };

      await publishFileCleanup(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.FILE_CLEANUP,
        expect.objectContaining({
          taskType: AsyncTaskType.FILE_CLEANUP,
          ...data,
        }),
        expect.objectContaining({
          attempts: 2,
          backoff: { type: 'exponential', delay: 1000 },
        })
      );
    });
  });

  describe('publishCacheInvalidation', () => {
    it('should publish cache invalidation event', async () => {
      const data = {
        source: EventSource.COMPANY_CONTROLLER_UPLOAD,
        companyId: 'company-123',
        cacheKey: 'test-cache-key',
      };

      await publishCacheInvalidation(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.CACHE_INVALIDATION,
        expect.objectContaining({
          taskType: AsyncTaskType.CACHE_INVALIDATION,
          ...data,
        }),
        expect.any(Object)
      );
    });
  });

  describe('publishErrorLog', () => {
    it('should publish error log event', async () => {
      const data = {
        source: EventSource.ERROR_MIDDLEWARE,
        companyId: 'company-123',
        method: 'POST',
        endpoint: '/api/error',
        statusCode: 500,
        errorMessage: 'Something went wrong',
      };

      await publishErrorLog(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.ERROR_LOGGING,
        expect.objectContaining({
          taskType: AsyncTaskType.ERROR_LOGGING,
          ...data,
        }),
        expect.any(Object)
      );
    });
  });

  describe('publishSearchCache', () => {
    it('should publish search cache event', async () => {
      const data = {
        source: EventSource.COMPANY_CONTROLLER_SEARCH,
        cacheKey: 'search:project-123:query',
        results: [],
        ttl: 3600,
      };

      await publishSearchCache(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.SEARCH_CACHING,
        expect.objectContaining({
          taskType: AsyncTaskType.SEARCH_CACHING,
          ...data,
        }),
        expect.any(Object)
      );
    });
  });

  describe('publishApiKeyTracking', () => {
    it('should publish API key tracking event', async () => {
      const data = {
        source: EventSource.AUTH_MIDDLEWARE,
        companyId: 'company-123',
      };

      await publishApiKeyTracking(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.API_KEY_TRACKING,
        expect.objectContaining({
          taskType: AsyncTaskType.API_KEY_TRACKING,
          ...data,
        }),
        expect.any(Object)
      );
    });
  });

  describe('publishAnalytics', () => {
    it('should publish analytics event', async () => {
      const data = {
        source: EventSource.PROJECT_CONTROLLER_CREATE,
        companyId: 'company-123',
        eventType: AnalyticsEventType.SEARCH,
        metadata: { query: 'test' },
      };

      await publishAnalytics(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.ANALYTICS,
        expect.objectContaining({
          taskType: AsyncTaskType.ANALYTICS,
          ...data,
        }),
        expect.any(Object)
      );
    });
  });

  describe('publishProjectStats', () => {
    it('should publish project stats event', async () => {
      const data = {
        source: EventSource.FILE_SERVICE_UPLOAD,
        projectId: 'project-123',
        fileCount: 10,
        totalSize: 1024,
      };

      await publishProjectStats(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.PROJECT_STATS,
        expect.objectContaining({
          taskType: AsyncTaskType.PROJECT_STATS,
          ...data,
        }),
        expect.any(Object)
      );
    });
  });

  describe('publishWebhook', () => {
    it('should publish webhook event with custom options', async () => {
      const data = {
        source: EventSource.COMPANY_CONTROLLER_UPLOAD,
        webhookUrl: 'https://example.com/webhook',
        eventType: 'file.uploaded',
        payload: { event: 'test' },
      };

      await publishWebhook(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.WEBHOOKS,
        expect.objectContaining({
          taskType: AsyncTaskType.WEBHOOKS,
          ...data,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        })
      );
    });
  });

  describe('publishStorageUpdate', () => {
    it('should publish storage update event', async () => {
      const data = {
        source: EventSource.INDEXING_PROCESSOR,
        companyId: 'company-123',
        fileSize: 1024,
      };

      await publishStorageUpdate(data);

      expect(mockAdd).toHaveBeenCalledWith(
        AsyncTaskType.STORAGE_UPDATES,
        expect.objectContaining({
          taskType: AsyncTaskType.STORAGE_UPDATES,
          ...data,
        }),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle queue add errors gracefully', async () => {
      mockAdd.mockRejectedValueOnce(new Error('Queue error'));

      const data = {
        source: EventSource.API_LOGGING_MIDDLEWARE,
        companyId: 'company-123',
        method: 'GET',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 100,
        ipAddress: '127.0.0.1',
      };

      // Should not throw
      await publishApiLog(data);

      expect(logger.error).toHaveBeenCalledWith('Failed to publish event', {
        taskType: AsyncTaskType.API_LOGGING,
        error: 'Queue error',
      });
    });

    it('should handle non-Error objects in catch', async () => {
      mockAdd.mockRejectedValueOnce('string error');

      const data = {
        source: EventSource.API_LOGGING_MIDDLEWARE,
        companyId: 'company-123',
        method: 'GET',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 100,
        ipAddress: '127.0.0.1',
      };

      await publishApiLog(data);

      expect(logger.error).toHaveBeenCalledWith('Failed to publish event', {
        taskType: AsyncTaskType.API_LOGGING,
        error: 'string error',
      });
    });
  });
});
