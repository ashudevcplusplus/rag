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
  FILE_DELETE = 'file_delete',
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
 * Chunk size presets for different document types
 */
export enum ChunkSizePreset {
  FAQ_SUPPORT = 'FAQ_SUPPORT',
  GENERAL = 'GENERAL',
  TECHNICAL = 'TECHNICAL',
  LEGAL = 'LEGAL',
  RESEARCH = 'RESEARCH',
  CUSTOM = 'CUSTOM',
}

/**
 * Chunk size configuration for each preset
 */
export interface ChunkSizeConfig {
  preset: ChunkSizePreset;
  chunkSize: number;
  chunkOverlap: number;
  label: string;
  description: string;
}

/**
 * Predefined chunk size configurations
 */
export const CHUNK_SIZE_PRESETS: Record<ChunkSizePreset, ChunkSizeConfig> = {
  [ChunkSizePreset.FAQ_SUPPORT]: {
    preset: ChunkSizePreset.FAQ_SUPPORT,
    chunkSize: 600,
    chunkOverlap: 100,
    label: 'FAQ / Support KB',
    description: 'Short, focused answers. Best for Q&A and support documentation.',
  },
  [ChunkSizePreset.GENERAL]: {
    preset: ChunkSizePreset.GENERAL,
    chunkSize: 1000,
    chunkOverlap: 200,
    label: 'General Documents',
    description: 'Balanced performance for most document types.',
  },
  [ChunkSizePreset.TECHNICAL]: {
    preset: ChunkSizePreset.TECHNICAL,
    chunkSize: 1500,
    chunkOverlap: 250,
    label: 'Technical Documentation',
    description: 'Keeps code examples and technical explanations intact.',
  },
  [ChunkSizePreset.LEGAL]: {
    preset: ChunkSizePreset.LEGAL,
    chunkSize: 1800,
    chunkOverlap: 300,
    label: 'Legal / Contracts',
    description: 'Maintains clause context for legal documents.',
  },
  [ChunkSizePreset.RESEARCH]: {
    preset: ChunkSizePreset.RESEARCH,
    chunkSize: 2200,
    chunkOverlap: 400,
    label: 'Research Papers',
    description: 'Preserves argument flow for academic content.',
  },
  [ChunkSizePreset.CUSTOM]: {
    preset: ChunkSizePreset.CUSTOM,
    chunkSize: 1000,
    chunkOverlap: 200,
    label: 'Custom',
    description: 'Set your own chunk size and overlap values.',
  },
};

/**
 * Get chunk configuration from preset
 */
export function getChunkConfig(preset: ChunkSizePreset): ChunkSizeConfig {
  return CHUNK_SIZE_PRESETS[preset] || CHUNK_SIZE_PRESETS[ChunkSizePreset.GENERAL];
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

// ============================================================================
// Event Source Enums
// ============================================================================

/**
 * Predefined sources for async events
 * Identifies where each event originated in the codebase
 */
export enum EventSource {
  // File Service
  FILE_SERVICE_UPLOAD = 'FileService.uploadFile',

  // Auth Middleware
  AUTH_MIDDLEWARE = 'AuthMiddleware.authenticateRequest',

  // Project Controller
  PROJECT_CONTROLLER_CREATE = 'ProjectController.createProject',
  PROJECT_CONTROLLER_UPDATE = 'ProjectController.updateProject',
  PROJECT_CONTROLLER_DELETE = 'ProjectController.deleteProject',
  PROJECT_CONTROLLER_DELETE_FILE = 'ProjectController.deleteFile',

  // Company Controller
  COMPANY_CONTROLLER_UPLOAD = 'CompanyController.uploadFile',
  COMPANY_CONTROLLER_SEARCH = 'CompanyController.searchCompany',

  // Chat Controller
  CHAT_CONTROLLER_CHAT = 'ChatController.chat',
  CHAT_CONTROLLER_STREAM = 'ChatController.chatStream',

  // Indexing Processor
  INDEXING_PROCESSOR = 'IndexingProcessor.processIndexJob',

  // Middleware
  ERROR_MIDDLEWARE = 'ErrorMiddleware.errorHandler',
  API_LOGGING_MIDDLEWARE = 'ApiLoggingMiddleware',
}
