import { Job } from 'bullmq';
import fs from 'fs/promises';
import { logger } from '../../utils/logger';
import { AsyncTaskType } from '@rag/types';
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
} from '../../types/events.types';
import { apiLogRepository } from '../../repositories/api-log.repository';
import { analyticsRepository } from '../../repositories/analytics.repository';
import { companyRepository } from '../../repositories/company.repository';
import { projectRepository } from '../../repositories/project.repository';
import { CacheService } from '../../services/cache.service';
import { CompanyModel } from '../../models/company.model';
import {
  validateFilePath,
  validateWebhookUrl,
  validateWebhookPayloadSize,
} from '../../utils/validation.util';

export async function processAsyncTask(job: Job): Promise<unknown> {
  const { taskType, source } = job.data;

  logger.debug('Processing async task', { jobId: job.id, taskType, source });

  switch (taskType) {
    // Triggered by: api-logging.middleware.ts on every API response
    // Does: Stores API request/response logs in database (method, endpoint, status, response time)
    case AsyncTaskType.API_LOGGING:
      return processApiLogging(job);

    // Triggered by: file.service.ts on duplicate upload, processing error, or after indexing
    // Does: Deletes temporary/processed files from disk to free up storage
    case AsyncTaskType.FILE_CLEANUP:
      return processFileCleanup(job);

    // Triggered by: company.controller.ts after bulk file uploads
    // Does: Invalidates Redis cache for a company to ensure fresh search results
    case AsyncTaskType.CACHE_INVALIDATION:
      return processCacheInvalidation(job);

    // Triggered by: error.middleware.ts on unhandled errors
    // Does: Stores error details in API logs for debugging and monitoring
    case AsyncTaskType.ERROR_LOGGING:
      return processErrorLogging(job);

    // Triggered by: company.controller.ts after search operations
    // Does: Stores search results in Redis cache with TTL for faster subsequent queries
    case AsyncTaskType.SEARCH_CACHING:
      return processSearchCaching(job);

    // Triggered by: auth.middleware.ts on every authenticated request
    // Does: Updates company.apiKeyLastUsed timestamp for usage tracking
    case AsyncTaskType.API_KEY_TRACKING:
      return processApiKeyTracking(job);

    // Triggered by: project/chat/company controllers on CRUD and search operations
    // Does: Stores analytics events in database for reporting and insights
    case AsyncTaskType.ANALYTICS:
      return processAnalytics(job);

    // Triggered by: file.service.ts after file upload
    // Does: Increments project.fileCount and project.totalSize counters
    case AsyncTaskType.PROJECT_STATS:
      return processProjectStats(job);

    // Triggered by: (reserved for external webhook notifications)
    // Does: Sends HTTP POST to configured webhook URLs with event payloads
    case AsyncTaskType.WEBHOOKS:
      return processWebhooks(job);

    // Triggered by: indexing/processor.ts after successful file indexing
    // Does: Increments company.storageUsed counter for quota tracking
    case AsyncTaskType.STORAGE_UPDATES:
      return processStorageUpdates(job);

    default:
      throw new Error(`Unknown task type: ${taskType}`);
  }
}

/**
 * Process API logging task
 */
async function processApiLogging(
  job: Job
): Promise<{ status: 'completed' | 'failed'; logged: boolean }> {
  const data = job.data as ApiLoggingJobData;

  try {
    // CompanyId is optional for public endpoints, but required for API log schema
    if (!data.companyId) {
      logger.debug('Skipping API log - no companyId', { endpoint: data.endpoint });
      return { status: 'completed', logged: false };
    }

    await apiLogRepository.create({
      companyId: data.companyId,
      method: data.method,
      endpoint: data.endpoint,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      apiKey: data.apiKey,
      requestSize: data.requestSize,
      responseSize: data.responseSize,
      errorMessage: data.errorMessage,
    });

    logger.debug('API log entry created', {
      jobId: job.id,
      endpoint: data.endpoint,
      statusCode: data.statusCode,
    });

    return { status: 'completed', logged: true };
  } catch (error) {
    logger.error('Failed to create API log entry', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Process file cleanup task
 */
async function processFileCleanup(
  job: Job
): Promise<{ status: 'completed' | 'failed'; deleted: boolean }> {
  const { filePath, reason } = job.data as FileCleanupJobData;

  try {
    // Validate file path for security
    if (!validateFilePath(filePath)) {
      throw new Error(`Invalid or unsafe file path: ${filePath}`);
    }

    await fs.unlink(filePath);
    logger.info('File deleted successfully', {
      jobId: job.id,
      filePath,
      reason,
    });

    return { status: 'completed', deleted: true };
  } catch (error) {
    // If file doesn't exist, consider it a success
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      logger.debug('File already deleted', { jobId: job.id, filePath });
      return { status: 'completed', deleted: false };
    }

    logger.error('Failed to delete file', {
      jobId: job.id,
      filePath,
      reason,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process cache invalidation task
 */
async function processCacheInvalidation(
  job: Job
): Promise<{ status: 'completed' | 'failed'; invalidated: boolean }> {
  const { companyId, cacheKey } = job.data as CacheInvalidationJobData;

  try {
    if (cacheKey) {
      // Delete specific cache key using CacheService
      // Note: CacheService doesn't expose direct key deletion, so we invalidate company cache
      // For specific key deletion, we'd need to add a method to CacheService
      await CacheService.invalidateCompany(companyId);
      logger.debug('Cache invalidated (company-wide)', {
        jobId: job.id,
        companyId,
        requestedKey: cacheKey,
      });
    } else {
      // Invalidate all company cache
      await CacheService.invalidateCompany(companyId);
      logger.info('Company cache invalidated', { jobId: job.id, companyId });
    }

    return { status: 'completed', invalidated: true };
  } catch (error) {
    logger.error('Failed to invalidate cache', {
      jobId: job.id,
      companyId,
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - cache invalidation failures shouldn't break the app
    return { status: 'failed', invalidated: false };
  }
}

/**
 * Process error logging task
 */
async function processErrorLogging(
  job: Job
): Promise<{ status: 'completed' | 'failed'; logged: boolean }> {
  const data = job.data as ErrorLoggingJobData;

  try {
    // CompanyId is optional, but required for API log schema
    if (!data.companyId) {
      logger.debug('Skipping error log - no companyId', { endpoint: data.endpoint });
      return { status: 'completed', logged: false };
    }

    await apiLogRepository.create({
      companyId: data.companyId,
      method: data.method,
      endpoint: data.endpoint,
      statusCode: data.statusCode,
      responseTime: 0, // Errors typically have no response time
      ipAddress: data.ipAddress || 'unknown',
      userAgent: data.userAgent,
      errorMessage: data.errorMessage,
    });

    logger.debug('Error log entry created', {
      jobId: job.id,
      endpoint: data.endpoint,
      statusCode: data.statusCode,
    });

    return { status: 'completed', logged: true };
  } catch (error) {
    logger.error('Failed to create error log entry', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Process search caching task
 */
async function processSearchCaching(
  job: Job
): Promise<{ status: 'completed' | 'failed'; cached: boolean }> {
  const { cacheKey, results, ttl } = job.data as SearchCachingJobData;

  try {
    await CacheService.set(cacheKey, results, ttl);
    logger.debug('Search results cached', {
      jobId: job.id,
      cacheKey,
      ttl,
    });

    return { status: 'completed', cached: true };
  } catch (error) {
    logger.error('Failed to cache search results', {
      jobId: job.id,
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - caching failures shouldn't break the app
    return { status: 'failed', cached: false };
  }
}

/**
 * Process API key tracking task
 */
async function processApiKeyTracking(
  job: Job
): Promise<{ status: 'completed' | 'failed'; updated: boolean }> {
  const { companyId } = job.data as ApiKeyTrackingJobData;

  try {
    // Use direct MongoDB update since apiKeyLastUsed is not in UpdateCompanyDTO
    await CompanyModel.findByIdAndUpdate(companyId, {
      $set: { apiKeyLastUsed: new Date() },
    });

    logger.debug('API key last used updated', {
      jobId: job.id,
      companyId,
    });

    return { status: 'completed', updated: true };
  } catch (error) {
    logger.error('Failed to update API key last used', {
      jobId: job.id,
      companyId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process analytics task
 */
async function processAnalytics(
  job: Job
): Promise<{ status: 'completed' | 'failed'; processed: boolean }> {
  const data = job.data as AnalyticsJobData;

  try {
    // CompanyId is required for analytics storage
    if (!data.companyId) {
      logger.warn('Skipping analytics - no companyId provided', {
        jobId: job.id,
        eventType: data.eventType,
      });
      return { status: 'completed', processed: false };
    }

    // Extract optional fields
    const ipAddress = data.metadata?.ipAddress;
    const userAgent = data.metadata?.userAgent;

    // Store analytics in database
    await analyticsRepository.create({
      companyId: data.companyId,
      eventType: data.eventType,
      metadata: data.metadata,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });

    logger.info('Analytics event processed and stored', {
      jobId: job.id,
      eventType: data.eventType,
      companyId: data.companyId,
    });

    return { status: 'completed', processed: true };
  } catch (error) {
    logger.error('Failed to process analytics event', {
      jobId: job.id,
      eventType: data.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process project stats update task
 */
async function processProjectStats(
  job: Job
): Promise<{ status: 'completed' | 'failed'; updated: boolean }> {
  const data = job.data as ProjectStatsJobData;

  try {
    // Validate project exists
    const project = await projectRepository.findById(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const statsToUpdate: { fileCount?: number; totalSize?: number } = {};
    // Allow zero and negative values for decrements
    if (data.fileCount !== undefined) {
      statsToUpdate.fileCount = data.fileCount;
    }
    if (data.totalSize !== undefined) {
      statsToUpdate.totalSize = data.totalSize;
    }

    if (Object.keys(statsToUpdate).length > 0) {
      await projectRepository.updateStats(data.projectId, statsToUpdate);
      logger.debug('Project stats updated', {
        jobId: job.id,
        projectId: data.projectId,
        stats: statsToUpdate,
      });
    } else {
      logger.debug('No stats to update', { jobId: job.id, projectId: data.projectId });
    }

    return { status: 'completed', updated: true };
  } catch (error) {
    logger.error('Failed to update project stats', {
      jobId: job.id,
      projectId: data.projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process webhooks task
 */
async function processWebhooks(
  job: Job
): Promise<{ status: 'completed' | 'failed'; sent: boolean }> {
  const { webhookUrl, eventType, payload, retryCount = 0 } = job.data as WebhooksJobData;

  try {
    // Validate webhook URL (checks format and prevents SSRF)
    if (!validateWebhookUrl(webhookUrl)) {
      throw new Error(`Invalid or unsafe webhook URL: ${webhookUrl}`);
    }

    // Validate payload size (default 1MB limit)
    if (!validateWebhookPayloadSize(payload)) {
      throw new Error('Webhook payload exceeds size limit (1MB)');
    }

    // Make HTTP POST request to webhook URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RAG-API-Webhook/1.0',
      },
      body: JSON.stringify({
        eventType,
        payload,
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Webhook returned status ${response.status}: ${errorText.substring(0, 200)}`);
    }

    logger.info('Webhook sent successfully', {
      jobId: job.id,
      webhookUrl,
      eventType,
      status: response.status,
      retryCount,
    });

    return { status: 'completed', sent: true };
  } catch (error) {
    logger.error('Failed to send webhook', {
      jobId: job.id,
      webhookUrl,
      eventType,
      retryCount,
      error: error instanceof Error ? error.message : String(error),
    });

    // Throw error to trigger retry mechanism (configured in queue)
    throw error;
  }
}

/**
 * Process storage updates task
 */
async function processStorageUpdates(
  job: Job
): Promise<{ status: 'completed' | 'failed'; updated: boolean }> {
  const { companyId, fileSize } = job.data as StorageUpdatesJobData;

  try {
    // Validate inputs
    if (!companyId || typeof fileSize !== 'number' || fileSize < 0) {
      throw new Error(`Invalid storage update data: companyId=${companyId}, fileSize=${fileSize}`);
    }

    // Verify company exists before updating
    const company = await companyRepository.findById(companyId);
    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    // Use the dedicated method for updating storage (increments storageUsed)
    await companyRepository.updateStorageUsed(companyId, fileSize);

    logger.debug('Company storage updated', {
      jobId: job.id,
      companyId,
      fileSize,
      newStorageUsed: (company.storageUsed || 0) + fileSize,
    });

    return { status: 'completed', updated: true };
  } catch (error) {
    logger.error('Failed to update company storage', {
      jobId: job.id,
      companyId,
      fileSize,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
