# Async Tasks That Can Run Without Blocking API Responses

This document lists all operations in the RAG API that can be moved to background/async processing to improve response times and user experience.

## Current Architecture

The API already uses:
- **BullMQ queues** for file indexing (non-blocking)
- **BullMQ queues** for consistency checks (non-blocking)
- **Redis caching** for search results (non-blocking reads)

## Opportunities for Async Processing

### 1. **API Request Logging** ⚠️ HIGH PRIORITY
**Current State**: `ApiLogRepository` exists but is NOT currently used in middleware
**Location**: `api/src/repositories/api-log.repository.ts`
**Impact**: Every API request could be logged without blocking the response

**What to do**:
- Create middleware that logs API requests asynchronously
- Fire-and-forget logging after response is sent
- Track: method, endpoint, statusCode, responseTime, ipAddress, userAgent, apiKey, requestSize, responseSize

**Example Implementation**:
```typescript
// Middleware that logs after response
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    res.send = originalSend;
    const responseTime = Date.now() - startTime;
    
    // Fire-and-forget logging
    setImmediate(() => {
      apiLogRepository.create({
        companyId: req.context?.companyId,
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        apiKey: req.headers['x-api-key'],
        requestSize: req.get('content-length'),
        responseSize: Buffer.byteLength(JSON.stringify(data)),
      }).catch(err => logger.error('Failed to log API request', { error: err }));
    });
    
    return originalSend.call(this, data);
  };
  
  next();
});
```

---

### 2. **File Cleanup Operations** ⚠️ MEDIUM PRIORITY
**Current State**: Synchronous file deletion using `fs.unlinkSync()`
**Location**: `api/src/services/file.service.ts:42`
**Impact**: Blocks response when duplicate files are detected

**What to do**:
- Replace `fs.unlinkSync()` with async `fs.promises.unlink()`
- Make it fire-and-forget (don't await)
- Log errors but don't fail the request

**Current Code**:
```42:45:api/src/services/file.service.ts
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        logger.warn('Failed to delete duplicate file', { path: file.path, error: err });
```

**Recommended Change**:
```typescript
// Fire-and-forget async deletion
fs.promises.unlink(file.path).catch(err => {
  logger.warn('Failed to delete duplicate file', { path: file.path, error: err });
});
```

---

### 3. **Cache Invalidation After File Upload** ⚠️ MEDIUM PRIORITY
**Current State**: Not currently implemented
**Location**: After file upload in `api/src/controllers/company.controller.ts`
**Impact**: Search cache should be invalidated when new files are uploaded, but this can be async

**What to do**:
- After successful file upload, fire-and-forget cache invalidation
- Use `CacheService.invalidateCompany(companyId)` asynchronously
- Don't block the response if cache invalidation fails

**Recommended Implementation**:
```typescript
// After file upload response is sent
res.status(202).json({...});

// Fire-and-forget cache invalidation
setImmediate(() => {
  CacheService.invalidateCompany(companyId).catch(err => {
    logger.warn('Failed to invalidate cache after upload', { companyId, error: err });
  });
});
```

---

### 4. **Project Statistics Updates** ⚠️ MEDIUM PRIORITY
**Current State**: Synchronous database update blocks response
**Location**: `api/src/services/file.service.ts:81-84`
**Impact**: Updating project stats (file count, total size) blocks the upload response

**What to do**:
- Move project stats update to fire-and-forget after response
- Update stats asynchronously after sending 202 response
- Consider eventual consistency (stats may be slightly delayed)

**Current Code**:
```80:84:api/src/services/file.service.ts
    // Update project stats (increment file count and size)
    await projectRepository.updateStats(projectId, {
      fileCount: 1,
      totalSize: file.size,
    });
```

**Recommended Change**:
- Keep the update synchronous for now (needed for storage limit checks)
- OR: Move to async after response if storage limits are checked elsewhere
- OR: Use a queue job for stats updates if eventual consistency is acceptable

---

### 5. **Company Storage Usage Updates** ⚠️ LOW PRIORITY
**Current State**: Not explicitly updated after file upload
**Location**: Should be updated after file indexing completes
**Impact**: Company storage usage tracking could be async

**What to do**:
- Update `company.storageUsed` asynchronously after file indexing
- This is likely already handled in the indexing consumer
- Verify and ensure it's non-blocking

---

### 6. **Search Result Caching** ✅ ALREADY ASYNC
**Current State**: Already async, but could be fire-and-forget
**Location**: `api/src/controllers/company.controller.ts:247`
**Impact**: Cache writes are awaited, but could be fire-and-forget

**Current Code**:
```246:247:api/src/controllers/company.controller.ts
  // 4. Cache the results
  await CacheService.set(cacheKey, results, 3600); // Cache for 1 hour
```

**Recommended Change**:
```typescript
// Fire-and-forget caching (optional optimization)
res.json({ results });

// Cache asynchronously after response
setImmediate(() => {
  CacheService.set(cacheKey, results, 3600).catch(err => {
    logger.warn('Failed to cache search results', { error: err });
  });
});
```

**Note**: Current implementation is fine, but this could save a few milliseconds on cache writes.

---

### 7. **API Key Last Used Timestamp** ⚠️ LOW PRIORITY
**Current State**: Not currently tracked
**Location**: `api/src/middleware/auth.middleware.ts`
**Impact**: Could track API key usage for analytics without blocking auth

**What to do**:
- After authentication succeeds, fire-and-forget update to `company.apiKeyLastUsed`
- Use `setImmediate()` to update after response
- Don't block authentication if update fails

**Recommended Implementation**:
```typescript
// After successful authentication
next();

// Fire-and-forget API key usage tracking
setImmediate(() => {
  companyRepository.updateApiKeyLastUsed(company._id).catch(err => {
    logger.debug('Failed to update API key last used', { error: err });
  });
});
```

---

### 8. **Error Logging to Database** ⚠️ MEDIUM PRIORITY
**Current State**: Errors are logged to Winston (file-based), but not to database
**Location**: `api/src/middleware/error.middleware.ts`
**Impact**: Could track errors in database for analytics without blocking error response

**What to do**:
- After error response is sent, log error details to database asynchronously
- Use ApiLogRepository or create ErrorLog model
- Fire-and-forget to avoid blocking error responses

**Recommended Implementation**:
```typescript
// In error handler, after sending response
res.status(err.statusCode).json({...});

// Fire-and-forget error logging
setImmediate(() => {
  apiLogRepository.create({
    companyId: req.context?.companyId,
    method: req.method,
    endpoint: req.path,
    statusCode: err.statusCode,
    responseTime: 0,
    ipAddress: req.ip,
    errorMessage: err.message,
  }).catch(logErr => logger.error('Failed to log error', { error: logErr }));
});
```

---

### 9. **Analytics and Metrics Collection** ⚠️ LOW PRIORITY
**Current State**: Basic metrics exist but could be enhanced
**Location**: Various controllers
**Impact**: Could collect detailed usage metrics without blocking responses

**What to do**:
- Track search query patterns asynchronously
- Track file upload patterns (file types, sizes)
- Track endpoint usage patterns
- All fire-and-forget after response

**Potential Metrics**:
- Search query frequency and patterns
- File upload sizes and types distribution
- Endpoint usage by company
- Response time percentiles
- Cache hit/miss ratios

---

### 10. **Notification/Webhook Triggers** ⚠️ FUTURE ENHANCEMENT
**Current State**: Not implemented
**Location**: After file upload, search, etc.
**Impact**: Could send webhooks/notifications asynchronously

**What to do**:
- After file upload completes, trigger webhooks asynchronously
- After indexing completes, send notifications
- Use BullMQ queue for reliable delivery
- Fire-and-forget from API response

---

## Implementation Priority

### High Priority (Immediate Impact)
1. ✅ **API Request Logging** - Most impactful, easy to implement
2. ✅ **File Cleanup Operations** - Simple fix, improves response time

### Medium Priority (Good ROI)
3. ✅ **Cache Invalidation** - Improves cache consistency
4. ✅ **Error Logging to Database** - Better error tracking
5. ✅ **Search Result Caching** - Minor optimization

### Low Priority (Nice to Have)
6. ⚠️ **API Key Last Used** - Analytics enhancement
7. ⚠️ **Analytics Collection** - Future feature
8. ⚠️ **Project Stats Updates** - May need to stay synchronous for limits

### Future Enhancements
9. ⚠️ **Webhook Triggers** - Requires webhook infrastructure
10. ⚠️ **Company Storage Updates** - Verify current implementation

---

## Best Practices for Async Tasks

1. **Use `setImmediate()` or `process.nextTick()`** for fire-and-forget operations
2. **Always catch errors** - Don't let async errors crash the process
3. **Log failures** - Track when async operations fail for monitoring
4. **Consider BullMQ** - For critical async tasks that need retries and reliability
5. **Don't await** - Never await fire-and-forget operations
6. **Response first** - Always send response before starting async work

---

## Example Pattern

```typescript
// ✅ GOOD: Fire-and-forget async task
export const someController = asyncHandler(async (req: Request, res: Response) => {
  // ... synchronous work ...
  
  // Send response first
  res.status(200).json({ success: true });
  
  // Then do async work (fire-and-forget)
  setImmediate(() => {
    someAsyncOperation().catch(err => {
      logger.error('Async operation failed', { error: err });
    });
  });
});

// ❌ BAD: Blocking async task
export const badController = asyncHandler(async (req: Request, res: Response) => {
  // ... work ...
  await someAsyncOperation(); // Blocks response!
  res.status(200).json({ success: true });
});
```

---

## Monitoring Async Tasks

Consider adding:
- Metrics for async task success/failure rates
- Alerts for high async task failure rates
- Dashboard showing async task queue depths
- Logging for async task execution times

---

## Notes

- All async tasks should be **non-critical** - API should work even if they fail
- Use **eventual consistency** where acceptable
- **Test thoroughly** - Async code can have race conditions
- **Monitor** - Track async task performance and failures

