import type {
  Company,
  User,
  Project,
  FileMetadata,
  SearchQuery,
  SearchResponse,
  Job,
  CreateProjectDTO,
  UpdateProjectDTO,
  AuthResponse,
  LoginCredentials,
  UploadResponse,
  PaginatedResponse,
  ApiError,
} from '@rag/types';

// ============================================================================
// API Client Configuration
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  token?: string; // JWT token for authenticated requests
  companyId?: string;
  onUnauthorized?: () => void;
}

let config: ApiClientConfig = {
  baseUrl: 'http://localhost:8000',
};

export function configureApiClient(newConfig: Partial<ApiClientConfig>): void {
  config = { ...config, ...newConfig };
}

export function getApiConfig(): ApiClientConfig {
  return { ...config };
}

export function setToken(token: string | null): void {
  config.token = token || undefined;
}

export function clearToken(): void {
  config.token = undefined;
}

// ============================================================================
// HTTP Client
// ============================================================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, timeout = 30000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Use JWT token if available, otherwise fall back to API key
  if (config.token) {
    requestHeaders['Authorization'] = `Bearer ${config.token}`;
  } else if (config.apiKey) {
    requestHeaders['x-api-key'] = config.apiKey;
  }

  if (body && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const url = `${config.baseUrl}${endpoint}`;
  
  // Debug logging in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log(`[API] ${method} ${url}`, body instanceof FormData ? '[FormData]' : body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
        message: errorData.message || errorData.error,
        statusCode: response.status,
      };

      console.error(`[API Error] ${method} ${url}:`, error);

      if (response.status === 401 && config.onUnauthorized) {
        config.onUnauthorized();
      }

      throw error;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw { error: 'Request timeout', statusCode: 408 } as ApiError;
    }
    // Re-throw API errors as-is
    if ((error as ApiError).statusCode) {
      throw error;
    }
    // Network errors
    console.error(`[API Network Error] ${method} ${url}:`, error);
    throw { error: 'Network error. Please check your connection.', statusCode: 0 } as ApiError;
  }
}

// ============================================================================
// Health Check
// ============================================================================

export async function checkHealth(): Promise<{ status: string }> {
  return request('/health');
}

// ============================================================================
// Authentication API
// ============================================================================

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return request('/v1/auth/login', {
      method: 'POST',
      body: credentials,
    });
  },

  async logout(): Promise<void> {
    return request('/v1/auth/logout', { method: 'POST' });
  },

  async getCurrentUser(): Promise<User> {
    return request(`/v1/companies/${config.companyId}/users/me`);
  },

  async refreshToken(): Promise<{ token: string }> {
    return request('/v1/auth/refresh', { method: 'POST' });
  },
};

// ============================================================================
// Company API
// ============================================================================

export const companyApi = {
  async get(companyId: string): Promise<{ company: Company }> {
    return request(`/v1/companies/${companyId}`);
  },

  async update(companyId: string, data: Partial<Company>): Promise<{ company: Company }> {
    return request(`/v1/companies/${companyId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async getStats(companyId: string): Promise<{
    userCount: number;
    projectCount: number;
    fileCount: number;
    storageUsed: number;
    storageLimit: number;
  }> {
    return request(`/v1/companies/${companyId}/stats`);
  },

  async clearCache(companyId: string): Promise<{ keysDeleted: number }> {
    return request(`/v1/companies/${companyId}/cache`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Projects API
// ============================================================================

export interface ProjectStats {
  fileCount: number;
  vectorCount: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  recentUploads: number;
}

export interface IndexingStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  // Indexing time metrics (in milliseconds)
  averageProcessingTimeMs?: number | null;
  minProcessingTimeMs?: number | null;
  maxProcessingTimeMs?: number | null;
}

export interface ReindexResponse {
  message: string;
  jobId?: string;
  fileId?: string;
  queued?: number;
  results?: { fileId: string; jobId: string }[];
  errors?: { fileId: string; error: string }[];
}

export const projectsApi = {
  async list(
    companyId: string,
    params?: { page?: number; limit?: number; status?: string; syncStats?: boolean }
  ): Promise<{ projects: Project[]; pagination: PaginatedResponse<Project>['pagination'] }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.syncStats) searchParams.set('syncStats', 'true');
    const query = searchParams.toString();
    return request(`/v1/companies/${companyId}/projects${query ? `?${query}` : ''}`);
  },

  async get(companyId: string, projectId: string, options?: { syncStats?: boolean }): Promise<{ project: Project }> {
    const query = options?.syncStats ? '?syncStats=true' : '';
    return request(`/v1/companies/${companyId}/projects/${projectId}${query}`);
  },

  async create(companyId: string, data: CreateProjectDTO): Promise<{ project: Project }> {
    return request(`/v1/companies/${companyId}/projects`, {
      method: 'POST',
      body: { ...data, companyId },
    });
  },

  async update(
    companyId: string,
    projectId: string,
    data: UpdateProjectDTO
  ): Promise<{ project: Project }> {
    return request(`/v1/companies/${companyId}/projects/${projectId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async delete(companyId: string, projectId: string): Promise<void> {
    return request(`/v1/companies/${companyId}/projects/${projectId}`, {
      method: 'DELETE',
    });
  },

  async archive(companyId: string, projectId: string, archive: boolean): Promise<{ message: string }> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/archive`, {
      method: 'POST',
      body: { archive },
    });
  },

  async getStats(companyId: string, projectId: string): Promise<ProjectStats> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/stats`);
  },

  async getIndexingStats(companyId: string, projectId: string): Promise<{ stats: IndexingStats }> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/indexing/stats`);
  },

  async reindexFile(companyId: string, projectId: string, fileId: string): Promise<ReindexResponse> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/files/${fileId}/reindex`, {
      method: 'POST',
    });
  },

  async bulkReindexFailed(companyId: string, projectId: string): Promise<ReindexResponse> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/indexing/retry-all`, {
      method: 'POST',
    });
  },
};

// ============================================================================
// Files API
// ============================================================================

// File upload constraints
export const FILE_UPLOAD_CONSTRAINTS = {
  maxFiles: 30,
  maxFileSize: 50 * 1024 * 1024, // 50MB in bytes
  allowedExtensions: ['.pdf', '.txt', '.doc', '.docx', '.rtf', '.odt', '.md', '.markdown', '.csv', '.xml', '.json', '.html', '.htm'],
  allowedMimeTypes: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'text/rtf',
    'application/vnd.oasis.opendocument.text',
    'text/markdown',
    'text/x-markdown',
    'text/csv',
    'application/xml',
    'text/xml',
    'application/json',
    'text/html',
  ],
} as const;

export function isAllowedFileType(file: File): boolean {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();
  return (
    FILE_UPLOAD_CONSTRAINTS.allowedExtensions.includes(extension as typeof FILE_UPLOAD_CONSTRAINTS.allowedExtensions[number]) ||
    FILE_UPLOAD_CONSTRAINTS.allowedMimeTypes.includes(mimeType as typeof FILE_UPLOAD_CONSTRAINTS.allowedMimeTypes[number])
  );
}

export function validateFilesForUpload(files: File[]): { valid: boolean; error?: string } {
  if (files.length === 0) {
    return { valid: false, error: 'No files selected' };
  }
  if (files.length > FILE_UPLOAD_CONSTRAINTS.maxFiles) {
    return { valid: false, error: `Maximum ${FILE_UPLOAD_CONSTRAINTS.maxFiles} files allowed per upload` };
  }
  const invalidFiles = files.filter(f => !isAllowedFileType(f));
  if (invalidFiles.length > 0) {
    const names = invalidFiles.map(f => f.name).join(', ');
    return { valid: false, error: `Unsupported file type(s): ${names}. Only document files (PDF, TXT, DOCX, DOC, RTF, ODT, MD, CSV, XML, JSON, HTML) are allowed.` };
  }
  // Check file size
  const oversizedFiles = files.filter(f => f.size > FILE_UPLOAD_CONSTRAINTS.maxFileSize);
  if (oversizedFiles.length > 0) {
    const maxSizeMB = FILE_UPLOAD_CONSTRAINTS.maxFileSize / (1024 * 1024);
    const names = oversizedFiles.map(f => f.name).join(', ');
    return { valid: false, error: `File(s) exceed ${maxSizeMB}MB limit: ${names}` };
  }
  return { valid: true };
}

export interface FilePreviewResponse {
  file: {
    _id: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    chunkCount: number;
    processingStatus: string;
  };
  content: string | null;
  chunks: string[];
  message?: string;
}

export const filesApi = {
  async list(
    companyId: string,
    projectId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ files: FileMetadata[]; pagination: PaginatedResponse<FileMetadata>['pagination'] }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return request(`/v1/companies/${companyId}/projects/${projectId}/files${query ? `?${query}` : ''}`);
  },

  async get(companyId: string, projectId: string, fileId: string): Promise<FilePreviewResponse> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/files/${fileId}`);
  },

  async getPreview(companyId: string, projectId: string, fileId: string): Promise<FilePreviewResponse> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/files/${fileId}`);
  },

  async upload(
    companyId: string,
    projectId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    // Validate files before uploading
    const validation = validateFilesForUpload(files);
    if (!validation.valid) {
      throw { error: validation.error, statusCode: 400 } as ApiError;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('projectId', projectId);

    // Note: Progress tracking would require XMLHttpRequest or a different approach
    // For simplicity, we're using fetch without progress tracking
    return request(`/v1/companies/${companyId}/uploads`, {
      method: 'POST',
      body: formData,
      timeout: 300000, // 5 minutes for uploads
    });
  },

  async delete(companyId: string, projectId: string, fileId: string): Promise<void> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/files/${fileId}`, {
      method: 'DELETE',
    });
  },

  async download(companyId: string, projectId: string, fileId: string, filename: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    } else if (config.apiKey) {
      headers['x-api-key'] = config.apiKey;
    }

    const response = await fetch(
      `${config.baseUrl}/v1/companies/${companyId}/projects/${projectId}/files/${fileId}/download`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ============================================================================
// Search API
// ============================================================================

export const searchApi = {
  async search(companyId: string, query: SearchQuery): Promise<SearchResponse> {
    return request(`/v1/companies/${companyId}/search`, {
      method: 'POST',
      body: query,
    });
  },
};

// ============================================================================
// Chat API
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  query: string;
  projectId: string; // Required for project scoping and security
  history?: ChatMessage[];
  limit?: number;
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    content: string;
    score: number;
    fileName?: string;
    projectName?: string;
    chunkIndex?: number;
  }>;
}

export const chatApi = {
  async chat(companyId: string, request: ChatRequest): Promise<ChatResponse> {
    return requestFn(`/v1/companies/${companyId}/chat`, {
      method: 'POST',
      body: request,
      timeout: 120000, // 2 minutes for chat
    });
  },

  streamChat(
    companyId: string,
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onComplete: (sources: ChatResponse['sources']) => void,
    onError: (error: Error) => void
  ): AbortController {
    const controller = new AbortController();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    } else if (config.apiKey) {
      headers['x-api-key'] = config.apiKey;
    }

    fetch(`${config.baseUrl}/v1/companies/${companyId}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let sources: ChatResponse['sources'] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                onComplete(sources);
                return;
              }
              try {
                const parsed = JSON.parse(data);
                // Handle both 'token' (streaming format) and 'content' (legacy format)
                if (parsed.token) {
                  onChunk(parsed.token);
                } else if (parsed.content) {
                  onChunk(parsed.content);
                }
                if (parsed.sources) {
                  sources = parsed.sources;
                }
              } catch {
                // Ignore parse errors for partial data
              }
            }
          }
        }

        onComplete(sources);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          onError(error);
        }
      });

    return controller;
  },
};

// Helper to use in chatApi (avoid naming conflict with 'request')
const requestFn = request;

// ============================================================================
// Jobs API
// ============================================================================

export const jobsApi = {
  async get(jobId: string): Promise<Job> {
    return request(`/v1/jobs/${jobId}`);
  },

  async list(params?: { page?: number; limit?: number }): Promise<{ jobs: Job[] }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return request(`/v1/jobs${query ? `?${query}` : ''}`);
  },
};

// ============================================================================
// Users API
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export const usersApi = {
  /**
   * Public login - just email and password
   * Uses the public auth endpoint
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return request(`/v1/auth/login`, {
      method: 'POST',
      body: credentials,
    });
  },

  async list(
    companyId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ users: User[]; pagination: PaginatedResponse<User>['pagination'] }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return request(`/v1/companies/${companyId}/users${query ? `?${query}` : ''}`);
  },

  async get(companyId: string, userId: string): Promise<{ user: User }> {
    return request(`/v1/companies/${companyId}/users/${userId}`);
  },

  async create(companyId: string, data: Partial<User> & { password: string }): Promise<{ user: User }> {
    return request(`/v1/companies/${companyId}/users`, {
      method: 'POST',
      body: { ...data, companyId },
    });
  },

  async update(companyId: string, userId: string, data: Partial<User>): Promise<{ user: User }> {
    return request(`/v1/companies/${companyId}/users/${userId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async delete(companyId: string, userId: string): Promise<void> {
    return request(`/v1/companies/${companyId}/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async setActive(companyId: string, userId: string, isActive: boolean): Promise<{ user: User }> {
    return request(`/v1/companies/${companyId}/users/${userId}/active`, {
      method: 'POST',
      body: { isActive },
    });
  },
};

// ============================================================================
// Vectors API
// ============================================================================

export const vectorsApi = {
  async list(
    companyId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ embeddings: unknown[]; page: number; totalPages: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return request(`/v1/companies/${companyId}/vectors${query ? `?${query}` : ''}`);
  },
};

// ============================================================================
// Conversations API
// ============================================================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatResponse['sources'];
  timestamp: string;
}

export interface Conversation {
  _id: string;
  companyId: string;
  userId?: string;
  projectId?: string;
  title: string;
  messages: ConversationMessage[];
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  title?: string;
  projectId?: string;
}

export interface AddMessageRequest {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatResponse['sources'];
}

export const conversationsApi = {
  async list(
    companyId: string,
    params?: { page?: number; limit?: number; projectId?: string }
  ): Promise<{ conversations: Conversation[]; pagination: { page: number; totalPages: number; total: number } }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    const query = searchParams.toString();
    return request(`/v1/companies/${companyId}/conversations${query ? `?${query}` : ''}`);
  },

  async get(companyId: string, conversationId: string): Promise<{ conversation: Conversation }> {
    return request(`/v1/companies/${companyId}/conversations/${conversationId}`);
  },

  async create(companyId: string, data: CreateConversationRequest): Promise<{ conversation: Conversation }> {
    return request(`/v1/companies/${companyId}/conversations`, {
      method: 'POST',
      body: data,
    });
  },

  async update(
    companyId: string,
    conversationId: string,
    data: { title?: string }
  ): Promise<{ conversation: Conversation }> {
    return request(`/v1/companies/${companyId}/conversations/${conversationId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async delete(companyId: string, conversationId: string): Promise<void> {
    return request(`/v1/companies/${companyId}/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },

  async addMessage(
    companyId: string,
    conversationId: string,
    message: AddMessageRequest
  ): Promise<{ message: ConversationMessage; conversation: Conversation }> {
    return request(`/v1/companies/${companyId}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: message,
    });
  },

  async updateMessage(
    companyId: string,
    conversationId: string,
    messageId: string,
    updates: Partial<AddMessageRequest>
  ): Promise<{ conversation: Conversation }> {
    return request(`/v1/companies/${companyId}/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      body: updates,
    });
  },

  async clearMessages(companyId: string, conversationId: string): Promise<{ message: string }> {
    return request(`/v1/companies/${companyId}/conversations/${conversationId}/messages`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Export All
// ============================================================================

export const api = {
  auth: authApi,
  company: companyApi,
  projects: projectsApi,
  files: filesApi,
  search: searchApi,
  chat: chatApi,
  conversations: conversationsApi,
  jobs: jobsApi,
  users: usersApi,
  vectors: vectorsApi,
  checkHealth,
};

export default api;
