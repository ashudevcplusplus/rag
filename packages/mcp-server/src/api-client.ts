import type {
  MCPServerConfig,
  ChatV2Request,
  ChatV2Response,
  SearchRequest,
  SearchResult,
  CreateProjectRequest,
  UpdateProjectRequest,
  Project,
  FileMetadata,
  Conversation,
  User,
  PaginationInfo,
  LoginResponse,
  AuthState,
} from "./types.js";

/**
 * HTTP client for making requests to the RAG API
 * Uses JWT token authentication (obtained via user login)
 */
export class ApiClient {
  private baseUrl: string;
  private authState: AuthState | null = null;
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, "");
    this.config = config;
  }

  /**
   * Initialize authentication - login with credentials or use provided token
   */
  async initialize(): Promise<void> {
    if (this.config.token) {
      // Use provided token - fetch user info to get companyId
      this.authState = {
        token: this.config.token,
        user: {
          _id: "",
          email: "",
          name: "",
          companyId: "",
          role: "",
          isActive: true,
        },
        companyId: "",
      };

      // Fetch user info to get the real companyId
      await this.fetchCurrentUserInfo();
      return;
    }

    if (this.config.email && this.config.password) {
      await this.login(this.config.email, this.config.password);
      return;
    }

    throw new Error(
      "Authentication required. Provide either RAG_USER_EMAIL and RAG_USER_PASSWORD, or RAG_TOKEN",
    );
  }

  /**
   * Fetch current user info using the token to populate auth state
   */
  private async fetchCurrentUserInfo(): Promise<void> {
    if (!this.authState?.token) {
      throw new Error("No token available");
    }

    const response = await fetch(`${this.baseUrl}/v1/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authState.token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user info: ${errorText}`);
    }

    const data = (await response.json()) as { user: AuthState["user"] };

    // Update auth state with real user info
    this.authState = {
      token: this.authState.token,
      user: data.user,
      companyId: data.user.companyId,
    };
  }

  /**
   * Login with email and password to get JWT token
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }
      throw new Error(`Login failed: ${errorMessage}`);
    }

    const loginResponse = (await response.json()) as LoginResponse;

    // Store auth state
    this.authState = {
      token: loginResponse.token,
      user: loginResponse.user,
      companyId: loginResponse.user.companyId,
    };

    return loginResponse;
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState | null {
    return this.authState;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authState !== null && !!this.authState.token;
  }

  /**
   * Get current company ID from auth state
   */
  private getCompanyId(companyId?: string): string {
    // Use provided companyId or fall back to authenticated user's company
    if (companyId) {
      return companyId;
    }
    if (this.authState?.companyId) {
      return this.authState.companyId;
    }
    throw new Error("Not authenticated. Please login first.");
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    if (!this.authState?.token) {
      throw new Error("Not authenticated. Please login first.");
    }

    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authState.token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    return response.json() as Promise<T>;
  }

  // ===== AUTH ENDPOINTS =====

  /**
   * Get current user info
   */
  getCurrentUser(): AuthState["user"] | null {
    return this.authState?.user || null;
  }

  /**
   * Get current user from API
   */
  async getCurrentUserFromApi(): Promise<{ user: AuthState["user"] }> {
    return this.request<{ user: AuthState["user"] }>("GET", "/v1/auth/me");
  }

  // ===== CHAT ENDPOINTS =====

  /**
   * Send a chat message and get an AI-generated response with RAG context
   * Uses Smart Agent with search modes, follow-ups, and confidence scoring
   */
  async chatV2(
    companyId: string | undefined,
    request: ChatV2Request,
  ): Promise<ChatV2Response> {
    const id = this.getCompanyId(companyId);
    return this.request<ChatV2Response>(
      "POST",
      `/v1/companies/${id}/chat`,
      request,
    );
  }

  /**
   * Chat with streaming (buffered response)
   * Note: Buffers the entire stream and returns the complete response
   */
  async chatV2Stream(
    companyId: string | undefined,
    request: ChatV2Request,
  ): Promise<ChatV2Response> {
    const id = this.getCompanyId(companyId);
    if (!this.authState?.token) {
      throw new Error("Not authenticated. Please login first.");
    }

    const url = `${this.baseUrl}/v1/companies/${id}/chat/stream`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authState.token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    // Buffer the entire SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let bufferedData = "";
    let finalResponse: ChatV2Response | null = null;

    if (!reader) {
      throw new Error("No response body available");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufferedData += decoder.decode(value, { stream: true });
        const lines = bufferedData.split("\n");
        bufferedData = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              // Keep updating with the latest complete response
              if (parsed.answer || parsed.sources) {
                finalResponse = parsed as ChatV2Response;
              }
            } catch (_e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!finalResponse) {
      throw new Error("No valid response received from stream");
    }

    return finalResponse;
  }

  // ===== SEARCH ENDPOINTS =====

  /**
   * Search for relevant documents in the vector store
   */
  async search(
    companyId: string | undefined,
    request: SearchRequest,
  ): Promise<{ results: SearchResult[] }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ results: SearchResult[] }>(
      "POST",
      `/v1/companies/${id}/search`,
      request,
    );
  }

  // ===== PROJECT ENDPOINTS =====

  /**
   * Create a new project
   */
  async createProject(
    companyId: string | undefined,
    request: CreateProjectRequest,
  ): Promise<{ project: Project }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ project: Project }>(
      "POST",
      `/v1/companies/${id}/projects`,
      request,
    );
  }

  /**
   * List all projects for a company
   */
  async listProjects(
    companyId: string | undefined,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      tags?: string[];
    },
  ): Promise<{ projects: Project[]; pagination: PaginationInfo }> {
    const id = this.getCompanyId(companyId);
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.status) params.set("status", options.status);
    if (options?.tags) params.set("tags", options.tags.join(","));

    const query = params.toString();
    return this.request<{ projects: Project[]; pagination: PaginationInfo }>(
      "GET",
      `/v1/companies/${id}/projects${query ? `?${query}` : ""}`,
    );
  }

  /**
   * Get a project by ID
   */
  async getProject(
    companyId: string | undefined,
    projectId: string,
  ): Promise<{ project: Project }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ project: Project }>(
      "GET",
      `/v1/companies/${id}/projects/${projectId}`,
    );
  }

  /**
   * Update a project
   */
  async updateProject(
    companyId: string | undefined,
    projectId: string,
    request: UpdateProjectRequest,
  ): Promise<{ project: Project }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ project: Project }>(
      "PATCH",
      `/v1/companies/${id}/projects/${projectId}`,
      request,
    );
  }

  /**
   * Delete a project
   */
  async deleteProject(
    companyId: string | undefined,
    projectId: string,
  ): Promise<{ message: string }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ message: string }>(
      "DELETE",
      `/v1/companies/${id}/projects/${projectId}`,
    );
  }

  /**
   * Archive or unarchive a project
   */
  async archiveProject(
    companyId: string | undefined,
    projectId: string,
    archive: boolean,
  ): Promise<{ message: string }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ message: string }>(
      "POST",
      `/v1/companies/${id}/projects/${projectId}/archive`,
      { archive },
    );
  }

  /**
   * Get project statistics
   */
  async getProjectStats(
    companyId: string | undefined,
    projectId: string,
  ): Promise<{ stats: Record<string, unknown> }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ stats: Record<string, unknown> }>(
      "GET",
      `/v1/companies/${id}/projects/${projectId}/stats`,
    );
  }

  /**
   * Search projects
   */
  async searchProjects(
    companyId: string | undefined,
    searchTerm: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ projects: Project[]; pagination: PaginationInfo }> {
    const id = this.getCompanyId(companyId);
    const params = new URLSearchParams({ q: searchTerm });
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());

    return this.request<{ projects: Project[]; pagination: PaginationInfo }>(
      "GET",
      `/v1/companies/${id}/projects/search?${params.toString()}`,
    );
  }

  // ===== FILE ENDPOINTS =====

  /**
   * List files in a project
   */
  async listFiles(
    companyId: string | undefined,
    projectId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ files: FileMetadata[]; pagination: PaginationInfo }> {
    const id = this.getCompanyId(companyId);
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());

    const query = params.toString();
    return this.request<{ files: FileMetadata[]; pagination: PaginationInfo }>(
      "GET",
      `/v1/companies/${id}/projects/${projectId}/files${query ? `?${query}` : ""}`,
    );
  }

  /**
   * Get file preview/content
   */
  async getFilePreview(
    companyId: string | undefined,
    projectId: string,
    fileId: string,
  ): Promise<{
    file: FileMetadata;
    content: string | null;
    chunks: string[];
    message?: string;
  }> {
    const id = this.getCompanyId(companyId);
    return this.request(
      "GET",
      `/v1/companies/${id}/projects/${projectId}/files/${fileId}`,
    );
  }

  /**
   * Delete a file
   */
  async deleteFile(
    companyId: string | undefined,
    projectId: string,
    fileId: string,
  ): Promise<{ message: string }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ message: string }>(
      "DELETE",
      `/v1/companies/${id}/projects/${projectId}/files/${fileId}`,
    );
  }

  /**
   * Reindex a file
   */
  async reindexFile(
    companyId: string | undefined,
    projectId: string,
    fileId: string,
  ): Promise<{ message: string; jobId: string; fileId: string }> {
    const id = this.getCompanyId(companyId);
    return this.request(
      "POST",
      `/v1/companies/${id}/projects/${projectId}/files/${fileId}/reindex`,
    );
  }

  /**
   * Get indexing stats for a project
   */
  async getIndexingStats(
    companyId: string | undefined,
    projectId: string,
  ): Promise<{
    stats: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      total: number;
      averageProcessingTimeMs: number;
      minProcessingTimeMs: number;
      maxProcessingTimeMs: number;
    };
  }> {
    const id = this.getCompanyId(companyId);
    return this.request(
      "GET",
      `/v1/companies/${id}/projects/${projectId}/indexing/stats`,
    );
  }

  /**
   * Bulk reindex failed files
   */
  async bulkReindexFailed(
    companyId: string | undefined,
    projectId: string,
  ): Promise<{
    message: string;
    queued: number;
    results: { fileId: string; jobId: string }[];
    errors?: { fileId: string; error: string }[];
  }> {
    const id = this.getCompanyId(companyId);
    return this.request(
      "POST",
      `/v1/companies/${id}/projects/${projectId}/indexing/retry-all`,
    );
  }

  /**
   * Download a file
   */
  async downloadFile(
    companyId: string | undefined,
    projectId: string,
    fileId: string,
  ): Promise<{ downloadUrl?: string; content?: string; message?: string }> {
    const id = this.getCompanyId(companyId);
    // This endpoint returns the file stream, so we need to handle it differently
    // For now, we'll return the URL or metadata
    const url = `${this.baseUrl}/v1/companies/${id}/projects/${projectId}/files/${fileId}/download`;
    return {
      downloadUrl: url,
      message:
        "Use the downloadUrl with Authorization header to download the file",
    };
  }

  /**
   * Upload files to a project
   * Note: This is a simplified implementation. Full multipart/form-data upload
   * would require additional dependencies and file reading capabilities.
   */
  async uploadFiles(
    companyId: string | undefined,
    _projectId: string,
    _filePaths: string[],
  ): Promise<{ message: string; files?: unknown[] }> {
    const _id = this.getCompanyId(companyId);
    // This is a placeholder - actual file upload would require FormData and file reading
    return {
      message:
        "File upload via MCP is not fully supported. Please use the API directly with multipart/form-data.",
      files: [],
    };
  }

  // ===== CONVERSATION ENDPOINTS =====

  /**
   * List conversations
   */
  async listConversations(
    companyId: string | undefined,
    options?: { page?: number; limit?: number; projectId?: string },
  ): Promise<{ conversations: Conversation[]; pagination: PaginationInfo }> {
    const id = this.getCompanyId(companyId);
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.projectId) params.set("projectId", options.projectId);

    const query = params.toString();
    return this.request<{
      conversations: Conversation[];
      pagination: PaginationInfo;
    }>("GET", `/v1/companies/${id}/conversations${query ? `?${query}` : ""}`);
  }

  /**
   * Create a conversation
   */
  async createConversation(
    companyId: string | undefined,
    options?: { title?: string; projectId?: string },
  ): Promise<{ conversation: Conversation }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ conversation: Conversation }>(
      "POST",
      `/v1/companies/${id}/conversations`,
      options,
    );
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(
    companyId: string | undefined,
    conversationId: string,
  ): Promise<{ conversation: Conversation }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ conversation: Conversation }>(
      "GET",
      `/v1/companies/${id}/conversations/${conversationId}`,
    );
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    companyId: string | undefined,
    conversationId: string,
    title: string,
  ): Promise<{ conversation: Conversation }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ conversation: Conversation }>(
      "PATCH",
      `/v1/companies/${id}/conversations/${conversationId}`,
      { title },
    );
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(
    companyId: string | undefined,
    conversationId: string,
  ): Promise<{ message: string }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ message: string }>(
      "DELETE",
      `/v1/companies/${id}/conversations/${conversationId}`,
    );
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    companyId: string | undefined,
    conversationId: string,
    message: {
      role: "user" | "assistant";
      content: string;
      sources?: unknown[];
    },
  ): Promise<{ message: unknown }> {
    const id = this.getCompanyId(companyId);
    return this.request(
      "POST",
      `/v1/companies/${id}/conversations/${conversationId}/messages`,
      message,
    );
  }

  /**
   * Clear all messages in a conversation
   */
  async clearMessages(
    companyId: string | undefined,
    conversationId: string,
  ): Promise<{ message: string }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ message: string }>(
      "DELETE",
      `/v1/companies/${id}/conversations/${conversationId}/messages`,
    );
  }

  /**
   * Update a specific message in a conversation
   */
  async updateMessage(
    companyId: string | undefined,
    conversationId: string,
    messageId: string,
    updates: { content?: string; sources?: unknown[] },
  ): Promise<{ message: unknown }> {
    const id = this.getCompanyId(companyId);
    return this.request(
      "PATCH",
      `/v1/companies/${id}/conversations/${conversationId}/messages/${messageId}`,
      updates,
    );
  }

  // ===== USER ENDPOINTS =====

  /**
   * List users
   */
  async listUsers(
    companyId: string | undefined,
    options?: { page?: number; limit?: number },
  ): Promise<{ users: User[]; pagination: PaginationInfo }> {
    const id = this.getCompanyId(companyId);
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());

    const query = params.toString();
    return this.request<{ users: User[]; pagination: PaginationInfo }>(
      "GET",
      `/v1/companies/${id}/users${query ? `?${query}` : ""}`,
    );
  }

  /**
   * Get a user by ID
   */
  async getUser(
    companyId: string | undefined,
    userId: string,
  ): Promise<{ user: User }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ user: User }>(
      "GET",
      `/v1/companies/${id}/users/${userId}`,
    );
  }

  /**
   * Create a user
   */
  async createUser(
    companyId: string | undefined,
    userData: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      role?: string;
    },
  ): Promise<{ user: User }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ user: User }>(
      "POST",
      `/v1/companies/${id}/users`,
      userData,
    );
  }

  /**
   * Update a user
   */
  async updateUser(
    companyId: string | undefined,
    userId: string,
    userData: {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    },
  ): Promise<{ user: User }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ user: User }>(
      "PATCH",
      `/v1/companies/${id}/users/${userId}`,
      userData,
    );
  }

  /**
   * Delete a user
   */
  async deleteUser(
    companyId: string | undefined,
    userId: string,
  ): Promise<{ message: string }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ message: string }>(
      "DELETE",
      `/v1/companies/${id}/users/${userId}`,
    );
  }

  /**
   * Set user active status
   */
  async setUserActive(
    companyId: string | undefined,
    userId: string,
    isActive: boolean,
  ): Promise<{ user: User }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ user: User }>(
      "POST",
      `/v1/companies/${id}/users/${userId}/active`,
      {
        isActive,
      },
    );
  }

  // ===== COMPANY ENDPOINTS =====

  /**
   * Get company details
   */
  async getCompany(
    companyId: string | undefined,
  ): Promise<{ company: Record<string, unknown> }> {
    const id = this.getCompanyId(companyId);
    return this.request<{ company: Record<string, unknown> }>(
      "GET",
      `/v1/companies/${id}`,
    );
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(
    companyId: string | undefined,
  ): Promise<Record<string, unknown>> {
    const id = this.getCompanyId(companyId);
    return this.request<Record<string, unknown>>(
      "GET",
      `/v1/companies/${id}/stats`,
    );
  }

  /**
   * Get vectors for a company
   */
  async getCompanyVectors(
    companyId: string | undefined,
    options?: { page?: number; limit?: number },
  ): Promise<{
    embeddings: unknown[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const id = this.getCompanyId(companyId);
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());

    const query = params.toString();
    return this.request(
      "GET",
      `/v1/companies/${id}/vectors${query ? `?${query}` : ""}`,
    );
  }

  /**
   * Trigger consistency check
   */
  async triggerConsistencyCheck(companyId?: string): Promise<{
    message: string;
    jobId: string;
    companyId: string;
    statusUrl: string;
  }> {
    const id = companyId || this.getCompanyId(companyId);
    const path = `/v1/companies/${id}/consistency-check`;
    return this.request("POST", path);
  }

  /**
   * Clear cache
   */
  async clearCache(
    companyId?: string,
  ): Promise<{ message: string; keysDeleted: number }> {
    const id = companyId || this.getCompanyId(companyId);
    const path = `/v1/companies/${id}/cache`;
    return this.request("DELETE", path);
  }

  // ===== JOB ENDPOINTS =====

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    state: string;
    progress: number;
    result?: unknown;
    reason?: string;
  }> {
    return this.request("GET", `/v1/jobs/${jobId}`);
  }

  /**
   * Get consistency check job status
   */
  async getConsistencyCheckJobStatus(jobId: string): Promise<{
    id: string;
    state: string;
    progress: number;
    result?: unknown;
    reason?: string;
  }> {
    return this.request("GET", `/v1/jobs/consistency/${jobId}`);
  }

  // ===== HEALTH ENDPOINTS =====

  /**
   * Health check (no auth required)
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json() as Promise<{ status: string; timestamp: string }>;
  }
}
