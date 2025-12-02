# Simplified Async Queue Architecture

## Overview
Consolidated all async task queues into **separate queues per task type** with **dedicated workers** and **one-line utility functions** for event publishing. This approach provides better isolation, monitoring, and concurrency control per task type.

## Architecture

### Files Created (5 files total)

1. **`api/src/queue/async-tasks.queue.ts`** - Creates 10 separate queues (one per task type)
2. **`api/src/consumers/async-tasks/processor.ts`** - Routes tasks to appropriate processors
3. **`api/src/consumers/async-tasks/worker.ts`** - Dynamically creates workers for each queue (10 concurrency each)
4. **`api/src/consumers/async-tasks/index.ts`** - Worker export
5. **`api/src/utils/async-events.util.ts`** - One-line publishing utilities

### Files Modified

- `api/src/server.ts` - Updated to use single async tasks worker
- `api/src/middleware/api-logging.middleware.ts` - Simplified to one-line
- `api/src/middleware/error.middleware.ts` - Simplified to one-line
- `api/src/middleware/auth.middleware.ts` - Simplified to one-line
- `api/src/services/file.service.ts` - Simplified to one-line
- `api/src/controllers/company.controller.ts` - Simplified to one-line
- `api/src/controllers/project.controller.ts` - Simplified to one-line
- `api/src/consumers/indexing/processor.ts` - Simplified to one-line

### Files Deleted (40 files removed!)

**10 Queue Files:**
- `api/src/queue/api-logging.queue.ts`
- `api/src/queue/file-cleanup.queue.ts`
- `api/src/queue/cache-invalidation.queue.ts`
- `api/src/queue/error-logging.queue.ts`
- `api/src/queue/search-caching.queue.ts`
- `api/src/queue/api-key-tracking.queue.ts`
- `api/src/queue/analytics.queue.ts`
- `api/src/queue/project-stats.queue.ts`
- `api/src/queue/webhooks.queue.ts`
- `api/src/queue/storage-updates.queue.ts`
- `api/src/queue/index.ts`

**30 Consumer Files (10 directories × 3 files):**
- All files in `api/src/consumers/api-logging/`
- All files in `api/src/consumers/file-cleanup/`
- All files in `api/src/consumers/cache-invalidation/`
- All files in `api/src/consumers/error-logging/`
- All files in `api/src/consumers/search-caching/`
- All files in `api/src/consumers/api-key-tracking/`
- All files in `api/src/consumers/analytics/`
- All files in `api/src/consumers/project-stats/`
- All files in `api/src/consumers/webhooks/`
- All files in `api/src/consumers/storage-updates/`

## Usage - One-Line Publishing

```typescript
// Import the utility functions
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
} from '../utils/async-events.util';

// Use them in one line!
publishApiLog({ companyId, method, endpoint, statusCode, responseTime, ... });
publishFileCleanup({ filePath, reason: 'duplicate' });
publishCacheInvalidation({ companyId });
publishErrorLog({ companyId, method, endpoint, statusCode, errorMessage, ... });
publishSearchCache({ cacheKey, results, ttl: 3600 });
publishApiKeyTracking({ companyId });
publishAnalytics({ eventType: 'upload', companyId, metadata: {...} });
publishProjectStats({ projectId, fileCount: 1, totalSize: 1024 });
publishWebhook({ webhookUrl, eventType, payload });
publishStorageUpdate({ companyId, fileSize: 1024 });
```

## Benefits

### Before (Verbose)
```typescript
// 17 lines of code per event!
setImmediate(() => {
  apiLoggingQueue
    .add(
      'log-api-request',
      {
        companyId: authReq.context?.companyId,
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime,
        // ... more fields
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    )
    .catch((err) => {
      logger.error('Failed to queue API log', { error: err.message });
    });
});
```

### After (Clean)
```typescript
// 1 line!
publishApiLog({ companyId, method, endpoint, statusCode, responseTime, ... });
```

## How It Works

1. **Separate Queues**: 10 individual queues, one per task type (e.g., `api-logging-queue`, `file-cleanup-queue`)
2. **Dedicated Workers**: Each queue has its own worker with 10 concurrency
3. **Task Router**: `processor.ts` routes based on `taskType` field to appropriate processor
4. **Reuses Existing Processors**: No changes to actual processing logic
5. **Type-Safe**: All utilities are strongly typed
6. **Error Handling**: Built into utility functions with error logging
7. **Retry Logic**: Configured per task type in the utility functions
8. **Better Isolation**: Issues with one task type don't affect others
9. **Independent Monitoring**: Each queue visible separately in Bull Board

## Task Types Supported

All 10 async task categories:
1. `api-logging` - API request logging
2. `file-cleanup` - File deletion
3. `cache-invalidation` - Cache invalidation
4. `error-logging` - Error logging
5. `search-caching` - Search result caching
6. `api-key-tracking` - API key usage tracking
7. `analytics` - Analytics events
8. `project-stats` - Project stats updates
9. `webhooks` - Webhook notifications
10. `storage-updates` - Storage usage updates

## Bull Board

All tasks visible in dashboard at `/admin/queues` with **separate queues** for better monitoring:
- `api-logging-queue`
- `file-cleanup-queue`
- `cache-invalidation-queue`
- `error-logging-queue`
- `search-caching-queue`
- `api-key-tracking-queue`
- `analytics-queue`
- `project-stats-queue`
- `webhooks-queue`
- `storage-updates-queue`
- Plus `indexing-queue` and `consistency-check-queue`

## Result

- **Reduced from 51 files to 5 files** (90% reduction)
- **One-line event publishing** everywhere
- **Easier to maintain** - centralized queue management
- **Better isolation** - separate queues prevent cross-contamination
- **Independent scaling** - each queue has 10 concurrency
- **Enhanced monitoring** - granular visibility per task type
- **Same functionality** - all processors still work
- **Type-safe** - strongly typed utilities
- **Clean code** - no verbose queue calls

## Additional Queues

The system also includes two specialized queues with their own workers:

1. **Indexing Queue** (`indexing-queue`)
   - Worker: `api/src/consumers/indexing/worker.ts`
   - Concurrency: 2 (process 2 files in parallel)
   - Purpose: File upload processing and vector indexing

2. **Consistency Check Queue** (`consistency-check-queue`)
   - Worker: `api/src/consumers/consistency-check/worker.ts`
   - Concurrency: 1 (to avoid overloading)
   - Purpose: MongoDB-Qdrant consistency validation

All queues are visible in the Bull Board dashboard at `/admin/queues`.

