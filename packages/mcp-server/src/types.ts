/**
 * Configuration for the MCP server
 */
export interface MCPServerConfig {
  /** Base URL of the RAG API (e.g., http://localhost:8000) */
  apiBaseUrl: string;
  /** User email for authentication */
  email?: string;
  /** User password for authentication */
  password?: string;
  /** Pre-existing JWT token (optional, will be generated from email/password if not provided) */
  token?: string;
}

/**
 * JWT Payload from the API
 */
export interface JWTPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
}

/**
 * Login response from the API
 */
export interface LoginResponse {
  message: string;
  user: {
    _id: string;
    email: string;
    name: string;
    companyId: string;
    role: string;
    isActive: boolean;
  };
  token: string;
}

/**
 * Chat message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Prompt template types
 */
export type PromptTemplateType =
  | 'customer_support'
  | 'sales_assistant'
  | 'technical_support'
  | 'onboarding_assistant'
  | 'faq_concise'
  | 'ecommerce_assistant';

/**
 * Chat request parameters
 */
export interface ChatRequest {
  query: string;
  projectId: string; // Required - all chat operations must be scoped to a project
  messages?: ChatMessage[];
  promptTemplate?: PromptTemplateType;
  systemPrompt?: string;
  limit?: number;
  rerank?: boolean;
  filter?: {
    fileId?: string;
    fileIds?: string[];
  };
  llmProvider?: 'openai' | 'gemini';
  embeddingProvider?: 'openai' | 'gemini';
  maxTokens?: number;
  temperature?: number;
  includeSources?: boolean;
  stream?: boolean;
  useLegacyChat?: boolean;
}

/**
 * Source chunk in chat response
 */
export interface ChatSource {
  fileId: string;
  fileName?: string;
  projectId?: string;
  projectName?: string;
  chunkIndex: number;
  content: string;
  score: number;
}

/**
 * Chat response structure
 */
export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: 'openai' | 'gemini';
}

// ===== ChatV2 Types =====

/**
 * Search mode for ChatV2
 */
export type SearchMode = 'smart' | 'fast' | 'deep';

/**
 * Response format for ChatV2
 */
export type ResponseFormat = 'text' | 'markdown' | 'structured';

/**
 * Extended prompt template types for V2
 */
export type PromptTemplateTypeV2 =
  | PromptTemplateType
  | 'research_assistant'
  | 'code_assistant';

/**
 * ChatV2 request parameters
 */
export interface ChatV2Request {
  query: string;
  projectId: string; // Required - all chat operations must be scoped to a project
  messages?: ChatMessage[];
  promptTemplate?: PromptTemplateTypeV2;
  systemPrompt?: string;

  // V2 specific features
  searchMode?: SearchMode;
  responseFormat?: ResponseFormat;
  includeReasoning?: boolean;
  language?: string;
  maxCitations?: number;
  expandContext?: boolean;

  // RAG settings
  limit?: number;
  rerank?: boolean;
  filter?: {
    fileId?: string;
    fileIds?: string[];
    tags?: string[];
  };

  // LLM settings
  llmProvider?: 'openai' | 'gemini';
  embeddingProvider?: 'openai' | 'gemini';
  maxTokens?: number;
  temperature?: number;

  // Response settings
  includeSources?: boolean;
  includeMetadata?: boolean;
  stream?: boolean;
}

/**
 * ChatV2 source with enhanced metadata
 */
export interface ChatV2Source extends ChatSource {
  highlight?: string;
  citationNumber?: number;
  relevanceExplanation?: string;
}

/**
 * Query analysis from planner
 */
export interface QueryAnalysis {
  intent: string;
  searchQueries: string[];
  keywords: string[];
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

/**
 * ChatV2 response structure
 */
export interface ChatV2Response {
  answer: string;
  sources: ChatV2Source[];
  queryAnalysis?: QueryAnalysis;
  reasoning?: string;
  suggestedFollowUps?: string[];
  confidence?: number;
  responseFormat: ResponseFormat;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: 'openai' | 'gemini';
  searchMode: SearchMode;
  processingTime?: number;
}

/**
 * Search request parameters
 */
export interface SearchRequest {
  query: string;
  limit?: number;
  filter?: Record<string, unknown>;
  rerank?: boolean;
  embeddingProvider?: 'openai' | 'gemini';
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  score: number;
  payload: {
    content?: string;
    text?: string;
    fileId?: string;
    fileName?: string;
    projectId?: string;
    projectName?: string;
    chunkIndex?: number;
    [key: string]: unknown;
  };
}

// Import enums from shared types package for use in this file
import { Visibility, ProjectStatus, UserRole } from '@rag/types';

// Re-export for external use
export { Visibility, ProjectStatus, UserRole };

/**
 * Create project request
 */
export interface CreateProjectRequest {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string[];
  visibility?: Visibility;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Update project request
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string[];
  status?: ProjectStatus;
  visibility?: Visibility;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Project response
 */
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
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  _id: string;
  projectId: string;
  originalFilename: string;
  filename: string;
  mimetype: string;
  size: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  chunkCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation structure
 */
export interface Conversation {
  _id: string;
  companyId: string;
  projectId?: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  createdAt: string;
}

/**
 * User structure
 */
export interface User {
  _id: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination response
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Auth state
 */
export interface AuthState {
  token: string;
  user: LoginResponse['user'];
  companyId: string;
}
