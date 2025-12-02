/**
 * Centralized Enums for the entire application
 * All enums are defined here in one place for easy reference and maintenance
 */

// ============================================================================
// Queue & Job Related Enums
// ============================================================================

/**
 * Async task types handled by the async-tasks queue
 */
export enum AsyncTaskType {
  API_LOGGING = 'api-logging',
  FILE_CLEANUP = 'file-cleanup',
  CACHE_INVALIDATION = 'cache-invalidation',
  ERROR_LOGGING = 'error-logging',
  SEARCH_CACHING = 'search-caching',
  API_KEY_TRACKING = 'api-key-tracking',
  ANALYTICS = 'analytics',
  PROJECT_STATS = 'project-stats',
  WEBHOOKS = 'webhooks',
  STORAGE_UPDATES = 'storage-updates',
}

/**
 * Job status states
 */
export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// ============================================================================
// Consumer Change Enums
// ============================================================================

/**
 * Types of consumer change events
 */
export enum ChangeType {
  CONSISTENCY_CHECK = 'CONSISTENCY_CHECK',
  CLEANUP_ORPHANED = 'CLEANUP_ORPHANED',
  VECTOR_DELETED = 'VECTOR_DELETED',
  CACHE_CLEARED = 'CACHE_CLEARED',
}

/**
 * Status of consumer change events
 */
export enum ChangeStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// ============================================================================
// Analytics Event Types
// ============================================================================

/**
 * Analytics event types
 */
export enum AnalyticsEventType {
  SEARCH = 'search',
  UPLOAD = 'upload',
  PROJECT_CREATE = 'project_create',
  PROJECT_UPDATE = 'project_update',
  PROJECT_DELETE = 'project_delete',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
}

// ============================================================================
// File Related Enums
// ============================================================================

/**
 * File upload status
 */
export enum UploadStatus {
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  FAILED = 'FAILED',
}

/**
 * File processing status
 */
export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

/**
 * File cleanup reasons
 */
export enum FileCleanupReason {
  DUPLICATE = 'duplicate',
  ERROR = 'error',
  CLEANUP = 'cleanup',
}

// ============================================================================
// Project Related Enums
// ============================================================================

/**
 * Project status
 */
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

/**
 * Project visibility
 */
export enum Visibility {
  PRIVATE = 'PRIVATE',
  TEAM = 'TEAM',
  COMPANY = 'COMPANY',
}

/**
 * Project member roles
 */
export enum ProjectRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// ============================================================================
// Company Related Enums
// ============================================================================

/**
 * Company subscription tiers
 */
export enum SubscriptionTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Company status
 */
export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// User Related Enums
// ============================================================================

/**
 * User roles within a company
 */
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

