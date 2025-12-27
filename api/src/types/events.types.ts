/**
 * Centralized Event Types for the entire application
 * All event interfaces and types are defined here in one place
 */

import { ChangeType, AnalyticsEventType, FileCleanupReason, EventSource } from './enums';

// ============================================================================
// Base Event Interface
// ============================================================================

export interface BaseEvent {
  eventId: string;
  eventType: ChangeType;
  timestamp: Date;
  companyId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Consumer Change Events
// ============================================================================

export interface ConsistencyCheckEvent extends BaseEvent {
  eventType: ChangeType.CONSISTENCY_CHECK;
  companyId?: string;
}

export interface CleanupOrphanedEvent extends BaseEvent {
  eventType: ChangeType.CLEANUP_ORPHANED;
  companyId?: string;
  autoFix?: boolean;
}

export type ConsumerEvent = ConsistencyCheckEvent | CleanupOrphanedEvent;

// ============================================================================
// Indexing Job Events
// ============================================================================

export interface IndexingJobData {
  companyId: string;
  fileId: string;
  filePath: string;
  mimetype: string;
  fileSizeMB: number;
  embeddingProvider?: 'openai' | 'gemini';
  embeddingModel?: string;
}

export interface JobResult {
  status: 'completed' | 'failed';
  chunks: number;
}

// ============================================================================
// Consistency Check Events
// ============================================================================

export interface ConsistencyCheckJobData {
  companyId?: string; // If undefined, check all companies
  eventId?: string; // Event ID for tracking
}

export interface CleanupOrphanedJobData {
  companyId?: string; // If undefined, cleanup all companies
  eventId?: string; // Event ID for tracking
  autoFix?: boolean; // If true, automatically cleanup after consistency check
}

export interface CheckAndFixJobData {
  companyId?: string; // If undefined, check and fix all companies
  eventId?: string; // Event ID for tracking
}

export interface ConsistencyCheckResult {
  status: 'completed' | 'failed';
  companiesChecked: number;
  discrepancies: Array<{
    companyId: string;
    companyName: string;
    issues: string[];
    dbVectorCount: number;
    qdrantVectorCount: number;
    missingInQdrant: number;
    missingInDb: number;
  }>;
}

export interface CleanupJobData {
  companyId?: string; // If undefined, cleanup all companies
}

export interface CleanupResult {
  status: 'completed' | 'failed';
  companiesProcessed: number;
  results: Array<{
    companyId: string;
    companyName: string;
    orphanedFiles: string[];
    vectorsDeleted: number;
    filesProcessed: number;
  }>;
}

export interface JobStatusResponse {
  id: string;
  state: string;
  progress: number | object;
  result?: JobResult | ConsistencyCheckResult;
  reason?: string;
}

// ============================================================================
// Async Task Events (formerly separate queue types)
// ============================================================================

/**
 * Base interface for all async task job data
 * Every async event must include the source to track where it originated
 */
export interface BaseAsyncTaskJobData {
  /** The source of the event - must be a predefined EventSource enum value */
  source: EventSource;
}

/**
 * API Logging Event
 */
export interface ApiLoggingJobData extends BaseAsyncTaskJobData {
  companyId?: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  apiKey?: string;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
}

/**
 * File Cleanup Event
 */
export interface FileCleanupJobData extends BaseAsyncTaskJobData {
  filePath: string;
  reason: FileCleanupReason;
}

/**
 * Cache Invalidation Event
 */
export interface CacheInvalidationJobData extends BaseAsyncTaskJobData {
  companyId: string;
  cacheKey?: string; // Optional specific key, if not provided invalidates all company cache
}

/**
 * Error Logging Event
 */
export interface ErrorLoggingJobData extends BaseAsyncTaskJobData {
  companyId?: string;
  method: string;
  endpoint: string;
  statusCode: number;
  errorMessage: string;
  stack?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Search Caching Event
 */
export interface SearchCachingJobData extends BaseAsyncTaskJobData {
  cacheKey: string;
  results: unknown;
  ttl: number; // Time to live in seconds
}

/**
 * API Key Tracking Event
 */
export interface ApiKeyTrackingJobData extends BaseAsyncTaskJobData {
  companyId: string;
}

/**
 * Analytics Event
 */
export interface AnalyticsJobData extends BaseAsyncTaskJobData {
  eventType: AnalyticsEventType;
  companyId?: string;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Project Stats Event
 */
export interface ProjectStatsJobData extends BaseAsyncTaskJobData {
  projectId: string;
  fileCount?: number; // Increment by this amount
  totalSize?: number; // Increment by this amount (bytes)
}

/**
 * Webhooks Event
 */
export interface WebhooksJobData extends BaseAsyncTaskJobData {
  webhookUrl: string;
  eventType: string;
  payload: Record<string, unknown>;
  companyId?: string;
  retryCount?: number;
}

/**
 * Storage Updates Event
 */
export interface StorageUpdatesJobData extends BaseAsyncTaskJobData {
  companyId: string;
  fileSize: number; // Size in bytes to add to storageUsed
}
