// ============================================================================
// Enums
// ============================================================================

export enum SubscriptionTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  TEAM = 'TEAM',
  COMPANY = 'COMPANY',
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
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
