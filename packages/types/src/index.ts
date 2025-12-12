// ============================================================================
// Enums - Single Source of Truth
// All enums are defined here and shared across the entire monorepo
// ============================================================================

// ----------------------------------------------------------------------------
// Queue & Job Related Enums
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Consumer Change Enums
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Analytics Event Types
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// File Related Enums
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Project Related Enums
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Company Related Enums
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// User Related Enums
// ----------------------------------------------------------------------------

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
// Company Types
// ============================================================================

export interface Company {
  _id: string;
  name: string;
  slug: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  storageLimit: number;
  storageUsed: number;
  maxUsers: number;
  maxProjects: number;
  apiKey?: string;
  status: CompanyStatus;
  settings?: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  notifications?: {
    email?: boolean;
    slack?: boolean;
  };
  features?: {
    advancedSearch?: boolean;
    apiAccess?: boolean;
  };
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  _id: string;
  companyId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  role: UserRole;
  permissions?: UserPermissions;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissions {
  canUpload?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
  canManageUsers?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  company: Company;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  _id: string;
  companyId: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  tags: string[];
  status: ProjectStatus;
  visibility: Visibility;
  fileCount: number;
  totalSize: number;
  vectorCount: number;
  settings?: ProjectSettings;
  metadata?: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  autoIndex?: boolean;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface ProjectMetadata {
  department?: string;
  category?: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface CreateProjectDTO {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  tags?: string[];
  visibility?: Visibility;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  color?: string;
  tags?: string[];
  status?: ProjectStatus;
  visibility?: Visibility;
}

// ============================================================================
// File Types
// ============================================================================

export interface FileMetadata {
  _id: string;
  companyId: string;
  projectId: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  hash: string;
  uploadedAt: string;
  processingStatus: ProcessingStatus;
  processingError?: string;
  errorMessage?: string;
  chunkCount: number;
  vectorIds: string[];
  metadata?: Record<string, unknown>;
}

export interface UploadResult {
  fileId: string;
  jobId: string;
  filename: string;
  statusUrl: string;
}

export interface UploadResponse {
  message: string;
  // Multi-file upload response
  results?: UploadResult[];
  errors?: { filename: string; error: string }[];
  // Single file upload response (backward compatibility)
  jobId?: string;
  fileId?: string;
  statusUrl?: string;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchQuery {
  query: string;
  limit?: number;
  projectId?: string;
  rerank?: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: {
    content?: string;
    text?: string;
    text_preview?: string;
    fileId?: string;
    fileName?: string;
    originalFilename?: string;
    projectId?: string;
    projectName?: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  processingTime?: number;
}

// ============================================================================
// Job Types
// ============================================================================

export interface Job {
  id: string;
  state: string;
  progress: number;
  data?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardStats {
  projectsCount: number;
  filesCount: number;
  searchCount: number;
  storageUsed: number;
  storageLimit: number;
}

export interface Activity {
  id: string;
  text: string;
  type: 'upload' | 'search' | 'project' | 'user' | 'system';
  timestamp: string;
}
