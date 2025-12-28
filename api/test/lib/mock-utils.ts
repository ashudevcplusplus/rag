/**
 * Centralized Mock Utilities for Unit Tests
 *
 * This file provides:
 * - Common mock data factories
 * - Type-safe mock objects
 * - Reusable mock functions
 * - Common test fixtures
 */

import { Types } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { ICompany } from '../../src/schemas/company.schema';
import { IProject } from '../../src/schemas/project.schema';
import { IFileMetadata } from '../../src/schemas/file-metadata.schema';
import { IUser } from '../../src/schemas/user.schema';
import { ChatRequest, ChatResponse, ChatSource } from '../../src/schemas/chat.schema';
import { SearchResult, SearchResultPayload } from '../../src/types/vector.types';
import {
  CompanyStatus,
  SubscriptionTier,
  ProjectStatus,
  Visibility,
  UserRole,
  ChangeStatus,
  ChangeType,
  ProcessingStatus,
  UploadStatus,
} from '@rag/types';
import { AuthenticatedRequest } from '../../src/middleware/auth.middleware';

// ============================================================================
// Type Definitions for Mocks
// ============================================================================

export interface MockLogger {
  info: jest.Mock;
  debug: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
}

export interface MockExpressResponse extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  flushHeaders: jest.Mock;
  write: jest.Mock;
  end: jest.Mock;
}

export interface MockExpressRequest {
  headers: Record<string, string | undefined>;
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  path: string;
  method: string;
  ip: string;
  body: Record<string, unknown>;
  get: jest.Mock;
}

export interface MockMongooseQuery<T> {
  where: jest.Mock;
  lean: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  select: jest.Mock;
  populate: jest.Mock;
  exec: jest.Mock;
  mockResolvedValue: (value: T | null) => MockMongooseQuery<T>;
}

export interface MockOpenAIClient {
  chat: {
    completions: {
      create: jest.Mock;
    };
  };
  embeddings: {
    create: jest.Mock;
  };
}

export interface MockFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
}

// ============================================================================
// ID Generators
// ============================================================================

/**
 * Generate a new MongoDB ObjectId string
 */
export function generateObjectId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Generate a MongoDB ObjectId
 */
export function createObjectId(id?: string): Types.ObjectId {
  return id ? new Types.ObjectId(id) : new Types.ObjectId();
}

// ============================================================================
// Mock Logger Factory
// ============================================================================

/**
 * Create a mock logger instance
 */
export function createMockLogger(): MockLogger {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

/**
 * Standard mock logger module for jest.mock
 */
export const mockLoggerModule = {
  logger: createMockLogger(),
};

// ============================================================================
// Express Mock Factories
// ============================================================================

/**
 * Create a mock Express Response
 */
export function createMockResponse(): MockExpressResponse {
  const res: MockExpressResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    flushHeaders: jest.fn(),
    write: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };
  return res;
}

/**
 * Create a mock Express Request
 */
export function createMockRequest(overrides?: Partial<MockExpressRequest>): MockExpressRequest {
  return {
    headers: {},
    params: {},
    query: {},
    path: '/test',
    method: 'GET',
    ip: '127.0.0.1',
    body: {},
    get: jest.fn((header: string) => {
      if (header === 'user-agent') return 'test-user-agent';
      return undefined;
    }),
    ...overrides,
  };
}

/**
 * Create a mock NextFunction
 */
export function createMockNext(): jest.MockedFunction<NextFunction> {
  return jest.fn();
}

/**
 * Create a mock Authenticated Request
 */
export function createMockAuthenticatedRequest(
  company: ICompany,
  overrides?: Partial<MockExpressRequest>
): AuthenticatedRequest {
  const req = createMockRequest(overrides) as unknown as AuthenticatedRequest;
  req.context = {
    company,
    companyId: company._id,
    apiKey: company.apiKey,
  };
  return req;
}

/**
 * Interface for validated file request (after middleware validation)
 */
export interface MockValidatedFileRequest extends AuthenticatedRequest {
  validatedProject: IProject;
  validatedFile: IFileMetadata;
  validatedCompanyId: string;
}

/**
 * Interface for validated project request (after middleware validation)
 */
export interface MockValidatedProjectRequest extends AuthenticatedRequest {
  validatedProject: IProject;
  validatedCompanyId: string;
}

/**
 * Create a mock request with validated file data (simulates middleware having run)
 */
export function createMockValidatedFileRequest(
  company: ICompany,
  project: IProject,
  file: IFileMetadata,
  overrides?: Partial<MockExpressRequest>
): MockValidatedFileRequest {
  const req = createMockAuthenticatedRequest(
    company,
    overrides
  ) as unknown as MockValidatedFileRequest;
  req.validatedProject = project;
  req.validatedFile = file;
  req.validatedCompanyId = company._id;
  return req;
}

/**
 * Create a mock request with validated project data (simulates middleware having run)
 */
export function createMockValidatedProjectRequest(
  company: ICompany,
  project: IProject,
  overrides?: Partial<MockExpressRequest>
): MockValidatedProjectRequest {
  const req = createMockAuthenticatedRequest(
    company,
    overrides
  ) as unknown as MockValidatedProjectRequest;
  req.validatedProject = project;
  req.validatedCompanyId = company._id;
  return req;
}

// ============================================================================
// Mongoose Mock Factories
// ============================================================================

/**
 * Create a chainable mock Mongoose query
 */
export function createMockMongooseQuery<T>(resolvedValue: T | null = null): MockMongooseQuery<T> {
  const query: MockMongooseQuery<T> = {
    where: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
    mockResolvedValue: (value: T | null) => {
      query.lean = jest.fn().mockResolvedValue(value);
      query.exec = jest.fn().mockResolvedValue(value);
      return query;
    },
  };
  return query;
}

// ============================================================================
// Entity Mock Factories
// ============================================================================

/**
 * Create a mock Company
 */
export function createMockCompany(overrides?: Partial<ICompany>): ICompany {
  const id = generateObjectId();
  return {
    _id: id,
    name: 'Test Company',
    slug: 'test-company',
    email: 'test@example.com',
    subscriptionTier: SubscriptionTier.FREE,
    storageLimit: 1073741824, // 1GB
    storageUsed: 0,
    maxUsers: 5,
    maxProjects: 10,
    apiKey: `ck_${id.substring(0, 16)}`,
    apiKeyHash: 'hashed-key',
    status: CompanyStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock Project
 */
export function createMockProject(companyId: string, overrides?: Partial<IProject>): IProject {
  const id = generateObjectId();
  return {
    _id: id,
    companyId,
    ownerId: companyId,
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    tags: [],
    status: ProjectStatus.ACTIVE,
    visibility: Visibility.PRIVATE,
    fileCount: 0,
    totalSize: 0,
    vectorCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock FileMetadata
 */
export function createMockFileMetadata(
  projectId: string,
  overrides?: Partial<IFileMetadata>
): IFileMetadata {
  const id = generateObjectId();
  return {
    _id: id,
    projectId,
    uploadedBy: 'user-123',
    filename: `file-${id.substring(0, 8)}`,
    originalFilename: 'test-document.txt',
    filepath: `/data/uploads/${id}`,
    mimetype: 'text/plain',
    size: 1024,
    hash: `hash-${id}`,
    uploadStatus: UploadStatus.UPLOADED,
    processingStatus: ProcessingStatus.COMPLETED,
    textExtracted: true,
    textLength: 1000,
    chunkCount: 5,
    vectorIndexed: true,
    uploadedAt: new Date(),
    retryCount: 0,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock User
 */
export function createMockUser(companyId: string, overrides?: Partial<IUser>): IUser {
  const id = generateObjectId();
  return {
    _id: id,
    companyId,
    email: `user-${id.substring(0, 8)}@example.com`,
    passwordHash: 'hashed-password',
    emailVerified: true,
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock uploaded file (Multer file)
 */
export function createMockUploadFile(overrides?: Partial<MockFile>): MockFile {
  return {
    path: '/tmp/test-file',
    originalname: 'test.txt',
    mimetype: 'text/plain',
    size: 1024,
    filename: 'test-file-123',
    ...overrides,
  };
}

// ============================================================================
// Chat & Vector Mock Factories
// ============================================================================

/**
 * Create a mock ChatRequest
 */
export function createMockChatRequest(overrides?: Partial<ChatRequest>): ChatRequest {
  return {
    query: 'What is the meaning of life?',
    limit: 5,
    includeSources: true,
    rerank: false,
    stream: false,
    ...overrides,
  };
}

/**
 * Create a mock ChatSource
 */
export function createMockChatSource(overrides?: Partial<ChatSource>): ChatSource {
  return {
    fileId: generateObjectId(),
    fileName: 'test-document.txt',
    chunkIndex: 0,
    content: 'Sample content from the document.',
    score: 0.95,
    ...overrides,
  };
}

/**
 * Create a mock ChatResponse
 */
export function createMockChatResponse(overrides?: Partial<ChatResponse>): ChatResponse {
  return {
    answer: 'The answer is 42.',
    sources: [createMockChatSource()],
    model: 'gpt-4',
    provider: 'openai',
    usage: {
      promptTokens: 100,
      completionTokens: 10,
      totalTokens: 110,
    },
    ...overrides,
  };
}

/**
 * Create a mock SearchResult
 */
export function createMockSearchResult(overrides?: Partial<SearchResult>): SearchResult {
  return {
    id: generateObjectId(),
    score: 0.95,
    payload: {
      fileId: generateObjectId(),
      chunkIndex: 0,
      content: 'Sample content',
      text_preview: 'Sample content...',
    } as SearchResultPayload,
    ...overrides,
  };
}

/**
 * Create mock embedding vectors
 */
export function createMockEmbedding(dimensions: number = 1536): number[] {
  return Array(dimensions).fill(0.1);
}

// ============================================================================
// Consumer Change Mock Factories
// ============================================================================

/**
 * Create a mock Consumer Change
 */
export function createMockConsumerChange(overrides?: {
  eventType?: ChangeType;
  status?: ChangeStatus;
  companyId?: string;
  eventData?: Record<string, unknown>;
}) {
  return {
    _id: createObjectId(),
    eventType: overrides?.eventType ?? ChangeType.CONSISTENCY_CHECK,
    status: overrides?.status ?? ChangeStatus.PENDING,
    companyId: overrides?.companyId ?? generateObjectId(),
    eventData: overrides?.eventData ?? { fileId: generateObjectId() },
    createdAt: new Date(),
  };
}

// ============================================================================
// OpenAI Mock Factories
// ============================================================================

/**
 * Create a mock OpenAI client
 */
export function createMockOpenAIClient(): MockOpenAIClient {
  return {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
    embeddings: {
      create: jest.fn(),
    },
  };
}

/**
 * Create a mock OpenAI chat completion response
 */
export function createMockChatCompletion(
  content: string,
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }
) {
  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
    usage: usage
      ? {
          prompt_tokens: usage.prompt_tokens ?? 100,
          completion_tokens: usage.completion_tokens ?? 10,
          total_tokens: usage.total_tokens ?? 110,
        }
      : undefined,
  };
}

/**
 * Create a mock OpenAI embedding response
 */
export function createMockEmbeddingResponse(count: number = 1, dimensions: number = 1536) {
  return {
    data: Array(count)
      .fill(0)
      .map((_, i) => ({
        embedding: createMockEmbedding(dimensions),
        index: i,
      })),
    model: 'text-embedding-3-small',
    object: 'list' as const,
    usage: {
      prompt_tokens: count * 5,
      total_tokens: count * 5,
    },
  };
}

// ============================================================================
// Async Generator Factories for Streaming
// ============================================================================

/**
 * Create a mock streaming response generator
 */
export function createMockStreamGenerator(tokens: string[]) {
  return (async function* () {
    for (const token of tokens) {
      yield {
        choices: [{ delta: { content: token } }],
      };
    }
    yield {
      choices: [{ delta: {} }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: tokens.length,
        total_tokens: 10 + tokens.length,
      },
    };
  })();
}

// ============================================================================
// Config Mock Utilities
// ============================================================================

/**
 * Type-safe config override helper
 */
export interface MockConfigOverrides {
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENAI_CHAT_MODEL?: string;
  GEMINI_CHAT_MODEL?: string;
  OPENAI_EMBEDDING_MODEL?: string;
  CHAT_MAX_TOKENS?: number;
  CHAT_TEMPERATURE?: number;
  LLM_PROVIDER?: 'openai' | 'gemini';
  QDRANT_URL?: string;
  EMBED_URL?: string;
  RERANK_URL?: string;
  INHOUSE_EMBEDDINGS?: boolean;
}

/**
 * Apply config overrides to CONFIG object
 */
export function applyConfigOverrides(
  config: Record<string, unknown>,
  overrides: MockConfigOverrides
): void {
  Object.assign(config, overrides);
}

/**
 * Default test config values
 */
export const DEFAULT_TEST_CONFIG: MockConfigOverrides = {
  OPENAI_API_KEY: 'test-openai-key',
  GEMINI_API_KEY: 'test-gemini-key',
  OPENAI_CHAT_MODEL: 'gpt-4',
  GEMINI_CHAT_MODEL: 'gemini-pro',
  OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
  CHAT_MAX_TOKENS: 1000,
  CHAT_TEMPERATURE: 0.7,
  LLM_PROVIDER: 'openai',
};

// ============================================================================
// Test Data Collections
// ============================================================================

/**
 * Common test IDs for consistent testing
 */
export const TEST_IDS = {
  COMPANY_ID: '507f1f77bcf86cd799439011',
  PROJECT_ID: '507f1f77bcf86cd799439012',
  FILE_ID: '507f1f77bcf86cd799439013',
  USER_ID: '507f1f77bcf86cd799439014',
};

/**
 * Create a complete test fixture with related entities
 */
export function createTestFixture() {
  const company = createMockCompany({ _id: TEST_IDS.COMPANY_ID });
  const project = createMockProject(company._id, { _id: TEST_IDS.PROJECT_ID });
  const file = createMockFileMetadata(project._id, { _id: TEST_IDS.FILE_ID });
  const user = createMockUser(company._id, { _id: TEST_IDS.USER_ID });

  return {
    company,
    project,
    file,
    user,
    searchResults: [
      createMockSearchResult({
        payload: {
          fileId: file._id,
          chunkIndex: 0,
          content: 'Content 1',
          text_preview: 'Content 1...',
        },
      }),
      createMockSearchResult({
        payload: {
          fileId: file._id,
          chunkIndex: 1,
          content: 'Content 2',
          text_preview: 'Content 2...',
        },
      }),
    ],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Cast a mock to its proper type for use with jest.Mock
 */
export function asMock<T extends (...args: unknown[]) => unknown>(fn: T): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

/**
 * Reset all mock functions in an object
 */
export function resetMocks(obj: Record<string, jest.Mock | unknown>): void {
  Object.values(obj).forEach((value) => {
    if (typeof value === 'function' && 'mockClear' in value) {
      (value as jest.Mock).mockClear();
    }
  });
}

// ============================================================================
// Type-Safe Static Member Access
// ============================================================================

/**
 * Type-safe way to access and reset private static members on a class
 */
export interface StaticServiceMembers {
  openai?: unknown | null;
  gemini?: unknown | null;
  genAI?: unknown | null;
  client?: unknown | null;
}

/**
 * Reset static client members on a service class
 */
export function resetStaticMembers<T extends StaticServiceMembers>(
  service: new () => unknown,
  members: (keyof StaticServiceMembers)[]
): void {
  const serviceWithStatics = service as unknown as StaticServiceMembers;
  members.forEach((member) => {
    serviceWithStatics[member] = null;
  });
}

// ============================================================================
// Mock Redis Types
// ============================================================================

export interface MockRedisClient {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  keys: jest.Mock;
  scanStream: jest.Mock;
  pipeline: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
  exists: jest.Mock;
  incr: jest.Mock;
  decr: jest.Mock;
  hget: jest.Mock;
  hset: jest.Mock;
  hdel: jest.Mock;
  hgetall: jest.Mock;
  quit: jest.Mock;
  disconnect: jest.Mock;
  info: jest.Mock;
  dbsize: jest.Mock;
  on: jest.Mock;
}

/**
 * Create a mock Redis client
 */
export function createMockRedisClient(): MockRedisClient {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    scanStream: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    expire: jest.fn(),
    ttl: jest.fn(),
    exists: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
    info: jest.fn(),
    dbsize: jest.fn(),
    on: jest.fn(),
  };
}

/**
 * Mock scan stream interface
 */
export interface MockScanStream {
  on: jest.Mock;
}

/**
 * Create a mock Redis scan stream
 */
export function createMockScanStream(keys: string[]): MockScanStream {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  const stream: MockScanStream = {
    on: jest.fn(),
  };

  // Define the on function separately to avoid circular reference
  stream.on = jest.fn((event: string, handler: (...args: unknown[]) => void): MockScanStream => {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(handler);
    // Simulate async events using setTimeout as alternative to setImmediate
    if (event === 'data') {
      setTimeout(() => handler(keys), 0);
    }
    if (event === 'end') {
      setTimeout(() => handler(), 0);
    }
    return stream;
  });

  return stream;
}

// ============================================================================
// Mock Qdrant Types
// ============================================================================

export interface MockQdrantClient {
  getCollection: jest.Mock;
  createCollection: jest.Mock;
  createPayloadIndex: jest.Mock;
  upsert: jest.Mock;
  search: jest.Mock;
  delete: jest.Mock;
  scroll: jest.Mock;
  count: jest.Mock;
}

/**
 * Create a mock Qdrant client
 */
export function createMockQdrantClient(): MockQdrantClient {
  return {
    getCollection: jest.fn(),
    createCollection: jest.fn(),
    createPayloadIndex: jest.fn(),
    upsert: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    scroll: jest.fn(),
    count: jest.fn(),
  };
}

/**
 * Create a mock error with status code (for Qdrant 404 errors)
 */
export interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

export function createMockHttpError(message: string, status: number): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

// ============================================================================
// Partial Request Type for Edge Case Testing
// ============================================================================

/**
 * Type for testing edge cases with partial/invalid request objects
 */
export interface PartialRequest {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
  path?: string;
  method?: string;
  ip?: string;
}

/**
 * Type guard helpers for tests
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
