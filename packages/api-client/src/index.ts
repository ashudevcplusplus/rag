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

  if (config.apiKey) {
    requestHeaders['x-api-key'] = config.apiKey;
  }

  if (body && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        error: errorData.error || `HTTP ${response.status}`,
        message: errorData.message,
        statusCode: response.status,
      };

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
    throw error;
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
    projectsCount: number;
    filesCount: number;
    storageUsed: number;
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

export const projectsApi = {
  async list(
    companyId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ projects: Project[]; pagination: PaginatedResponse<Project>['pagination'] }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return request(`/v1/companies/${companyId}/projects${query ? `?${query}` : ''}`);
  },

  async get(companyId: string, projectId: string): Promise<{ project: Project }> {
    return request(`/v1/companies/${companyId}/projects/${projectId}`);
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
};

// ============================================================================
// Files API
// ============================================================================

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

  async get(companyId: string, projectId: string, fileId: string): Promise<{ file: FileMetadata }> {
    return request(`/v1/companies/${companyId}/projects/${projectId}/files/${fileId}`);
  },

  async upload(
    companyId: string,
    projectId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
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

export const usersApi = {
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
// Export All
// ============================================================================

export const api = {
  auth: authApi,
  company: companyApi,
  projects: projectsApi,
  files: filesApi,
  search: searchApi,
  jobs: jobsApi,
  users: usersApi,
  vectors: vectorsApi,
  checkHealth,
};

export default api;
