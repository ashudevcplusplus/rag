#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ApiClient } from "./api-client.js";
import type { MCPServerConfig, Visibility, ProjectStatus } from "./types.js";

// Get configuration from environment variables
const config: MCPServerConfig = {
  apiBaseUrl: process.env.RAG_API_URL || "http://localhost:8000",
  email: process.env.RAG_USER_EMAIL,
  password: process.env.RAG_USER_PASSWORD,
  token: process.env.RAG_TOKEN,
};

const apiClient = new ApiClient(config);

// Define all available tools
const tools: Tool[] = [
  // ===== AUTH TOOLS =====
  {
    name: "auth_login",
    description:
      "Login with email and password to authenticate. This generates a JWT token for subsequent API calls. Use this if you need to switch users or re-authenticate.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "User email address" },
        password: { type: "string", description: "User password" },
      },
      required: ["email", "password"],
    },
  },
  {
    name: "auth_status",
    description: "Get current authentication status and user info.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "auth_me",
    description: "Get current authenticated user information from the API.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ===== CHAT & SEARCH TOOLS =====
  {
    name: "rag_chat",
    description:
      "Send a message to the Smart Agent RAG-powered chat endpoint. Uses intelligent query planning, multi-query search, and context expansion for better answers. Features: smart/fast/deep search modes, response format options, query analysis, confidence scoring, and suggested follow-ups.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID (uses authenticated user's company if not provided)",
        },
        projectId: {
          type: "string",
          description:
            "Project ID (required) - all chat operations must be scoped to a project",
        },
        query: {
          type: "string",
          description: "The question or message to send",
        },
        messages: {
          type: "array",
          description: "Conversation history for multi-turn chat",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant", "system"] },
              content: { type: "string" },
            },
            required: ["role", "content"],
          },
        },
        searchMode: {
          type: "string",
          enum: ["smart", "fast", "deep"],
          description:
            "Search mode: smart (balanced, default), fast (lowest latency), deep (highest quality)",
          default: "smart",
        },
        responseFormat: {
          type: "string",
          enum: ["text", "markdown", "structured"],
          description: "Response format",
          default: "markdown",
        },
        includeReasoning: {
          type: "boolean",
          description: "Include thinking/reasoning process",
          default: false,
        },
        language: {
          type: "string",
          description: "ISO 639-1 language code for response",
        },
        maxCitations: {
          type: "number",
          description: "Max sources to cite (1-20)",
          default: 5,
        },
        expandContext: {
          type: "boolean",
          description: "Enable context expansion",
          default: true,
        },
        promptTemplate: {
          type: "string",
          enum: [
            "customer_support",
            "sales_assistant",
            "technical_support",
            "onboarding_assistant",
            "faq_concise",
            "ecommerce_assistant",
            "research_assistant",
            "code_assistant",
          ],
          description: "Predefined prompt template",
        },
        systemPrompt: {
          type: "string",
          description: "Custom system prompt (overrides template)",
        },
        limit: {
          type: "number",
          description: "Number of context chunks (1-50)",
          default: 10,
        },
        rerank: {
          type: "boolean",
          description: "Rerank results",
          default: true,
        },
        filter: {
          type: "object",
          description:
            "Additional filters for RAG search (fileId, fileIds, or tags)",
          properties: {
            fileId: { type: "string" },
            fileIds: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
          },
        },
        llmProvider: {
          type: "string",
          enum: ["openai", "gemini"],
          description: "LLM provider",
        },
        embeddingProvider: {
          type: "string",
          enum: ["openai", "gemini"],
          description: "Embedding provider",
        },
        maxTokens: { type: "number", description: "Max tokens (100-8192)" },
        temperature: { type: "number", description: "LLM temperature (0-2)" },
        includeSources: {
          type: "boolean",
          description: "Include sources",
          default: true,
        },
        includeMetadata: {
          type: "boolean",
          description: "Include detailed metadata and follow-ups",
          default: false,
        },
      },
      required: ["projectId", "query"],
    },
  },
  {
    name: "rag_chat_stream",
    description:
      "Chat with streaming response (buffered). Streams the response from the API and returns the complete result. Note: Due to MCP limitations, the entire stream is buffered and returned once complete rather than streamed incrementally.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID (uses authenticated user's company if not provided)",
        },
        projectId: {
          type: "string",
          description:
            "Project ID (required) - all chat operations must be scoped to a project",
        },
        query: {
          type: "string",
          description: "The question or message to send",
        },
        messages: {
          type: "array",
          description: "Conversation history for multi-turn chat",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant", "system"] },
              content: { type: "string" },
            },
            required: ["role", "content"],
          },
        },
        searchMode: {
          type: "string",
          enum: ["smart", "fast", "deep"],
          description:
            "Search mode: smart (balanced, default), fast (lowest latency), deep (highest quality)",
          default: "smart",
        },
        responseFormat: {
          type: "string",
          enum: ["text", "markdown", "structured"],
          description: "Response format",
          default: "markdown",
        },
        includeReasoning: {
          type: "boolean",
          description: "Include thinking/reasoning process",
          default: false,
        },
        language: {
          type: "string",
          description: "ISO 639-1 language code for response",
        },
        maxCitations: {
          type: "number",
          description: "Max sources to cite (1-20)",
          default: 5,
        },
        expandContext: {
          type: "boolean",
          description: "Enable context expansion",
          default: true,
        },
        promptTemplate: {
          type: "string",
          enum: [
            "customer_support",
            "sales_assistant",
            "technical_support",
            "onboarding_assistant",
            "faq_concise",
            "ecommerce_assistant",
            "research_assistant",
            "code_assistant",
          ],
          description: "Predefined prompt template",
        },
        systemPrompt: {
          type: "string",
          description: "Custom system prompt (overrides template)",
        },
        limit: {
          type: "number",
          description: "Number of context chunks (1-50)",
          default: 10,
        },
        rerank: {
          type: "boolean",
          description: "Rerank results",
          default: true,
        },
        filter: {
          type: "object",
          description:
            "Additional filters for RAG search (fileId, fileIds, or tags)",
          properties: {
            fileId: { type: "string" },
            fileIds: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
          },
        },
        llmProvider: {
          type: "string",
          enum: ["openai", "gemini"],
          description: "LLM provider",
        },
        embeddingProvider: {
          type: "string",
          enum: ["openai", "gemini"],
          description: "Embedding provider",
        },
        maxTokens: { type: "number", description: "Max tokens (100-8192)" },
        temperature: { type: "number", description: "LLM temperature (0-2)" },
        includeSources: {
          type: "boolean",
          description: "Include sources",
          default: true,
        },
        includeMetadata: {
          type: "boolean",
          description: "Include detailed metadata and follow-ups",
          default: false,
        },
      },
      required: ["projectId", "query"],
    },
  },
  {
    name: "rag_search",
    description:
      "Search for relevant documents in the vector store. Returns matching chunks with scores and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID (uses authenticated user's company if not provided)",
        },
        query: { type: "string", description: "Search query" },
        limit: {
          type: "number",
          description: "Number of results (1-100)",
          default: 10,
        },
        filter: { type: "object", description: "Filter criteria" },
        rerank: {
          type: "boolean",
          description: "Whether to rerank results",
          default: false,
        },
        embeddingProvider: {
          type: "string",
          enum: ["openai", "gemini"],
          description: "Embedding provider",
        },
      },
      required: ["query"],
    },
  },

  // ===== PROJECT TOOLS =====
  {
    name: "project_list",
    description:
      "List all projects for a company. Returns paginated project list with metadata.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        page: { type: "number", description: "Page number", default: 1 },
        limit: { type: "number", description: "Items per page", default: 20 },
        status: {
          type: "string",
          enum: ["ACTIVE", "ARCHIVED", "DELETED"],
          description: "Project status: ACTIVE, ARCHIVED, or DELETED",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
      },
    },
  },
  {
    name: "project_get",
    description: "Get details of a specific project by ID.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_create",
    description: "Create a new project for organizing documents.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        name: { type: "string", description: "Project name (1-100 chars)" },
        slug: {
          type: "string",
          description: "URL-friendly slug (lowercase, numbers, hyphens)",
        },
        description: {
          type: "string",
          description: "Project description (max 500 chars)",
        },
        color: { type: "string", description: "Hex color (e.g., #FF5733)" },
        icon: { type: "string", description: "Icon name (max 50 chars)" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Project tags",
        },
        visibility: {
          type: "string",
          enum: ["PRIVATE", "TEAM", "COMPANY"],
          description: "Visibility level: PRIVATE, TEAM, or COMPANY",
        },
      },
      required: ["name", "slug"],
    },
  },
  {
    name: "project_update",
    description: "Update an existing project.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
        name: { type: "string" },
        description: { type: "string" },
        color: { type: "string" },
        icon: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        status: {
          type: "string",
          enum: ["ACTIVE", "ARCHIVED", "DELETED"],
          description: "Project status: ACTIVE, ARCHIVED, or DELETED",
        },
        visibility: {
          type: "string",
          enum: ["PRIVATE", "TEAM", "COMPANY"],
          description: "Visibility level: PRIVATE, TEAM, or COMPANY",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_delete",
    description: "Delete a project and all its associated files and vectors.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID to delete" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_archive",
    description: "Archive or unarchive a project.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
        archive: {
          type: "boolean",
          description: "true to archive, false to unarchive",
        },
      },
      required: ["projectId", "archive"],
    },
  },
  {
    name: "project_stats",
    description:
      "Get statistics for a project including file counts and sizes.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_search",
    description: "Search for projects by name or description.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        searchTerm: { type: "string", description: "Search term" },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
      },
      required: ["searchTerm"],
    },
  },

  // ===== FILE TOOLS =====
  {
    name: "file_list",
    description: "List files in a project.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
      },
      required: ["projectId"],
    },
  },
  {
    name: "file_preview",
    description:
      "Get file content and metadata. Returns the text content and chunks.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
        fileId: { type: "string", description: "File ID" },
      },
      required: ["projectId", "fileId"],
    },
  },
  {
    name: "file_delete",
    description: "Delete a file from a project.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
        fileId: { type: "string", description: "File ID to delete" },
      },
      required: ["projectId", "fileId"],
    },
  },
  {
    name: "file_reindex",
    description: "Reindex a file (useful for failed or outdated files).",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
        fileId: { type: "string", description: "File ID to reindex" },
      },
      required: ["projectId", "fileId"],
    },
  },
  {
    name: "file_download",
    description:
      "Download a file from a project. Returns download URL or file content.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
        fileId: { type: "string", description: "File ID to download" },
      },
      required: ["projectId", "fileId"],
    },
  },
  {
    name: "file_upload",
    description:
      "Upload files to a project. Note: File upload requires multipart/form-data which may not be fully supported in all MCP clients. Use the API directly for reliable file uploads.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: {
          type: "string",
          description: "Project ID to upload files to",
        },
        filePaths: {
          type: "array",
          items: { type: "string" },
          description: "Array of local file paths to upload",
        },
      },
      required: ["projectId", "filePaths"],
    },
  },
  {
    name: "indexing_stats",
    description: "Get indexing statistics for a project.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "indexing_retry_failed",
    description: "Bulk retry all failed file indexing jobs in a project.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        projectId: { type: "string", description: "Project ID" },
      },
      required: ["projectId"],
    },
  },

  // ===== CONVERSATION TOOLS =====
  {
    name: "conversation_list",
    description: "List all conversations for a company.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
        projectId: { type: "string", description: "Filter by project ID" },
      },
    },
  },
  {
    name: "conversation_create",
    description: "Create a new conversation.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        title: { type: "string", description: "Conversation title" },
        projectId: { type: "string", description: "Associate with a project" },
      },
    },
  },
  {
    name: "conversation_get",
    description: "Get a conversation with all messages.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        conversationId: { type: "string", description: "Conversation ID" },
      },
      required: ["conversationId"],
    },
  },
  {
    name: "conversation_update",
    description: "Update a conversation title.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        conversationId: { type: "string", description: "Conversation ID" },
        title: { type: "string", description: "New title" },
      },
      required: ["conversationId", "title"],
    },
  },
  {
    name: "conversation_delete",
    description: "Delete a conversation.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        conversationId: { type: "string", description: "Conversation ID" },
      },
      required: ["conversationId"],
    },
  },
  {
    name: "conversation_add_message",
    description: "Add a message to a conversation.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        conversationId: { type: "string", description: "Conversation ID" },
        role: {
          type: "string",
          enum: ["user", "assistant"],
          description: "Message role",
        },
        content: { type: "string", description: "Message content" },
        sources: {
          type: "array",
          description: "Sources for assistant messages",
        },
      },
      required: ["conversationId", "role", "content"],
    },
  },
  {
    name: "conversation_clear_messages",
    description: "Clear all messages from a conversation.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        conversationId: { type: "string", description: "Conversation ID" },
      },
      required: ["conversationId"],
    },
  },
  {
    name: "conversation_update_message",
    description:
      "Update a specific message in a conversation (useful for streaming updates).",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        conversationId: { type: "string", description: "Conversation ID" },
        messageId: { type: "string", description: "Message ID to update" },
        content: { type: "string", description: "Updated message content" },
        sources: {
          type: "array",
          description: "Updated sources for assistant messages",
        },
      },
      required: ["conversationId", "messageId"],
    },
  },

  // ===== USER TOOLS =====
  {
    name: "user_list",
    description: "List all users for a company.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "user_get",
    description: "Get user details by ID.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        userId: { type: "string", description: "User ID" },
      },
      required: ["userId"],
    },
  },
  {
    name: "user_create",
    description: "Create a new user.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        email: { type: "string", description: "User email" },
        firstName: { type: "string", description: "User first name" },
        lastName: { type: "string", description: "User last name" },
        password: { type: "string", description: "User password" },
        role: { type: "string", description: "User role" },
      },
      required: ["email", "firstName", "lastName", "password"],
    },
  },
  {
    name: "user_update",
    description: "Update a user.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        userId: { type: "string", description: "User ID" },
        email: { type: "string" },
        firstName: { type: "string", description: "User first name" },
        lastName: { type: "string", description: "User last name" },
        role: { type: "string" },
      },
      required: ["userId"],
    },
  },
  {
    name: "user_delete",
    description: "Delete a user.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        userId: { type: "string", description: "User ID" },
      },
      required: ["userId"],
    },
  },
  {
    name: "user_set_active",
    description: "Activate or deactivate a user.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        userId: { type: "string", description: "User ID" },
        isActive: {
          type: "boolean",
          description: "true to activate, false to deactivate",
        },
      },
      required: ["userId", "isActive"],
    },
  },

  // ===== COMPANY TOOLS =====
  {
    name: "company_get",
    description: "Get company details.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
      },
    },
  },
  {
    name: "company_stats",
    description:
      "Get company statistics including file counts, sizes, and usage.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
      },
    },
  },
  {
    name: "company_vectors",
    description: "Get vector embeddings for a company.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "Company ID" },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
      },
    },
  },

  // ===== ADMIN TOOLS =====
  {
    name: "consistency_check",
    description:
      "Trigger a consistency check between database and vector store.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID (optional, checks authenticated user's company if not provided)",
        },
      },
    },
  },
  {
    name: "cache_clear",
    description: "Clear search cache.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID (optional, clears authenticated user's company cache if not provided)",
        },
      },
    },
  },
  {
    name: "job_status",
    description: "Get the status of a background job.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID" },
      },
      required: ["jobId"],
    },
  },
  {
    name: "job_consistency_status",
    description: "Get the status of a consistency check background job.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Consistency check job ID" },
      },
      required: ["jobId"],
    },
  },
  {
    name: "health_check",
    description: "Check if the API is healthy and responding.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Tool handler function
async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    let result: unknown;

    switch (name) {
      // Auth
      case "auth_login":
        result = await apiClient.login(
          args.email as string,
          args.password as string,
        );
        // Remove token from response for security
        result = {
          message: (result as { message: string }).message,
          user: (result as { user: unknown }).user,
          authenticated: true,
        };
        break;

      case "auth_status": {
        const authState = apiClient.getAuthState();
        result = authState
          ? {
              authenticated: true,
              user: authState.user,
              companyId: authState.companyId,
            }
          : {
              authenticated: false,
              message: "Not logged in. Use auth_login to authenticate.",
            };
        break;
      }

      case "auth_me":
        result = await apiClient.getCurrentUserFromApi();
        break;

      // Chat & Search
      case "rag_chat":
        result = await apiClient.chatV2(args.companyId as string | undefined, {
          projectId: args.projectId as string,
          query: args.query as string,
          messages: args.messages as Array<{
            role: "user" | "assistant" | "system";
            content: string;
          }>,
          searchMode: args.searchMode as "smart" | "fast" | "deep" | undefined,
          responseFormat: args.responseFormat as
            | "text"
            | "markdown"
            | "structured"
            | undefined,
          includeReasoning: args.includeReasoning as boolean | undefined,
          language: args.language as string | undefined,
          maxCitations: args.maxCitations as number | undefined,
          expandContext: args.expandContext as boolean | undefined,
          promptTemplate: args.promptTemplate as
            | "customer_support"
            | "sales_assistant"
            | "technical_support"
            | "onboarding_assistant"
            | "faq_concise"
            | "ecommerce_assistant"
            | "research_assistant"
            | "code_assistant"
            | undefined,
          systemPrompt: args.systemPrompt as string | undefined,
          limit: args.limit as number | undefined,
          rerank: args.rerank as boolean | undefined,
          filter: args.filter as
            | {
                fileId?: string;
                fileIds?: string[];
                tags?: string[];
              }
            | undefined,
          llmProvider: args.llmProvider as "openai" | "gemini" | undefined,
          embeddingProvider: args.embeddingProvider as
            | "openai"
            | "gemini"
            | undefined,
          maxTokens: args.maxTokens as number | undefined,
          temperature: args.temperature as number | undefined,
          includeSources: args.includeSources as boolean | undefined,
          includeMetadata: args.includeMetadata as boolean | undefined,
        });
        break;

      case "rag_search":
        result = await apiClient.search(args.companyId as string | undefined, {
          query: args.query as string,
          limit: args.limit as number | undefined,
          filter: args.filter as Record<string, unknown> | undefined,
          rerank: args.rerank as boolean | undefined,
          embeddingProvider: args.embeddingProvider as
            | "openai"
            | "gemini"
            | undefined,
        });
        break;

      case "rag_chat_stream":
        result = await apiClient.chatV2Stream(
          args.companyId as string | undefined,
          {
            projectId: args.projectId as string,
            query: args.query as string,
            messages: args.messages as Array<{
              role: "user" | "assistant" | "system";
              content: string;
            }>,
            searchMode: args.searchMode as
              | "smart"
              | "fast"
              | "deep"
              | undefined,
            responseFormat: args.responseFormat as
              | "text"
              | "markdown"
              | "structured"
              | undefined,
            includeReasoning: args.includeReasoning as boolean | undefined,
            language: args.language as string | undefined,
            maxCitations: args.maxCitations as number | undefined,
            expandContext: args.expandContext as boolean | undefined,
            promptTemplate: args.promptTemplate as
              | "customer_support"
              | "sales_assistant"
              | "technical_support"
              | "onboarding_assistant"
              | "faq_concise"
              | "ecommerce_assistant"
              | "research_assistant"
              | "code_assistant"
              | undefined,
            systemPrompt: args.systemPrompt as string | undefined,
            limit: args.limit as number | undefined,
            rerank: args.rerank as boolean | undefined,
            filter: args.filter as
              | {
                  fileId?: string;
                  fileIds?: string[];
                  tags?: string[];
                }
              | undefined,
            llmProvider: args.llmProvider as "openai" | "gemini" | undefined,
            embeddingProvider: args.embeddingProvider as
              | "openai"
              | "gemini"
              | undefined,
            maxTokens: args.maxTokens as number | undefined,
            temperature: args.temperature as number | undefined,
            includeSources: args.includeSources as boolean | undefined,
            includeMetadata: args.includeMetadata as boolean | undefined,
          },
        );
        break;

      // Projects
      case "project_list":
        result = await apiClient.listProjects(
          args.companyId as string | undefined,
          {
            page: args.page as number | undefined,
            limit: args.limit as number | undefined,
            status: args.status as string | undefined,
            tags: args.tags as string[] | undefined,
          },
        );
        break;

      case "project_get":
        result = await apiClient.getProject(
          args.companyId as string | undefined,
          args.projectId as string,
        );
        break;

      case "project_create":
        result = await apiClient.createProject(
          args.companyId as string | undefined,
          {
            name: args.name as string,
            slug: args.slug as string,
            description: args.description as string | undefined,
            color: args.color as string | undefined,
            icon: args.icon as string | undefined,
            tags: args.tags as string[] | undefined,
            visibility: args.visibility as Visibility | undefined,
          },
        );
        break;

      case "project_update":
        result = await apiClient.updateProject(
          args.companyId as string | undefined,
          args.projectId as string,
          {
            name: args.name as string | undefined,
            description: args.description as string | undefined,
            color: args.color as string | undefined,
            icon: args.icon as string | undefined,
            tags: args.tags as string[] | undefined,
            status: args.status as ProjectStatus | undefined,
            visibility: args.visibility as Visibility | undefined,
          },
        );
        break;

      case "project_delete":
        result = await apiClient.deleteProject(
          args.companyId as string | undefined,
          args.projectId as string,
        );
        break;

      case "project_archive":
        result = await apiClient.archiveProject(
          args.companyId as string | undefined,
          args.projectId as string,
          args.archive as boolean,
        );
        break;

      case "project_stats":
        result = await apiClient.getProjectStats(
          args.companyId as string | undefined,
          args.projectId as string,
        );
        break;

      case "project_search":
        result = await apiClient.searchProjects(
          args.companyId as string | undefined,
          args.searchTerm as string,
          {
            page: args.page as number | undefined,
            limit: args.limit as number | undefined,
          },
        );
        break;

      // Files
      case "file_list":
        result = await apiClient.listFiles(
          args.companyId as string | undefined,
          args.projectId as string,
          {
            page: args.page as number | undefined,
            limit: args.limit as number | undefined,
          },
        );
        break;

      case "file_preview":
        result = await apiClient.getFilePreview(
          args.companyId as string | undefined,
          args.projectId as string,
          args.fileId as string,
        );
        break;

      case "file_delete":
        result = await apiClient.deleteFile(
          args.companyId as string | undefined,
          args.projectId as string,
          args.fileId as string,
        );
        break;

      case "file_reindex":
        result = await apiClient.reindexFile(
          args.companyId as string | undefined,
          args.projectId as string,
          args.fileId as string,
        );
        break;

      case "indexing_stats":
        result = await apiClient.getIndexingStats(
          args.companyId as string | undefined,
          args.projectId as string,
        );
        break;

      case "indexing_retry_failed":
        result = await apiClient.bulkReindexFailed(
          args.companyId as string | undefined,
          args.projectId as string,
        );
        break;

      case "file_download":
        result = await apiClient.downloadFile(
          args.companyId as string | undefined,
          args.projectId as string,
          args.fileId as string,
        );
        break;

      case "file_upload":
        result = await apiClient.uploadFiles(
          args.companyId as string | undefined,
          args.projectId as string,
          args.filePaths as string[],
        );
        break;

      // Conversations
      case "conversation_list":
        result = await apiClient.listConversations(
          args.companyId as string | undefined,
          {
            page: args.page as number | undefined,
            limit: args.limit as number | undefined,
            projectId: args.projectId as string | undefined,
          },
        );
        break;

      case "conversation_create":
        result = await apiClient.createConversation(
          args.companyId as string | undefined,
          {
            title: args.title as string | undefined,
            projectId: args.projectId as string | undefined,
          },
        );
        break;

      case "conversation_get":
        result = await apiClient.getConversation(
          args.companyId as string | undefined,
          args.conversationId as string,
        );
        break;

      case "conversation_update":
        result = await apiClient.updateConversation(
          args.companyId as string | undefined,
          args.conversationId as string,
          args.title as string,
        );
        break;

      case "conversation_delete":
        result = await apiClient.deleteConversation(
          args.companyId as string | undefined,
          args.conversationId as string,
        );
        break;

      case "conversation_add_message":
        result = await apiClient.addMessage(
          args.companyId as string | undefined,
          args.conversationId as string,
          {
            role: args.role as "user" | "assistant",
            content: args.content as string,
            sources: args.sources as unknown[] | undefined,
          },
        );
        break;

      case "conversation_clear_messages":
        result = await apiClient.clearMessages(
          args.companyId as string | undefined,
          args.conversationId as string,
        );
        break;

      case "conversation_update_message":
        result = await apiClient.updateMessage(
          args.companyId as string | undefined,
          args.conversationId as string,
          args.messageId as string,
          {
            content: args.content as string | undefined,
            sources: args.sources as unknown[] | undefined,
          },
        );
        break;

      // Users
      case "user_list":
        result = await apiClient.listUsers(
          args.companyId as string | undefined,
          {
            page: args.page as number | undefined,
            limit: args.limit as number | undefined,
          },
        );
        break;

      case "user_get":
        result = await apiClient.getUser(
          args.companyId as string | undefined,
          args.userId as string,
        );
        break;

      case "user_create":
        result = await apiClient.createUser(
          args.companyId as string | undefined,
          {
            email: args.email as string,
            firstName: args.firstName as string,
            lastName: args.lastName as string,
            password: args.password as string,
            role: args.role as string | undefined,
          },
        );
        break;

      case "user_update":
        result = await apiClient.updateUser(
          args.companyId as string | undefined,
          args.userId as string,
          {
            email: args.email as string | undefined,
            firstName: args.firstName as string | undefined,
            lastName: args.lastName as string | undefined,
            role: args.role as string | undefined,
          },
        );
        break;

      case "user_delete":
        result = await apiClient.deleteUser(
          args.companyId as string | undefined,
          args.userId as string,
        );
        break;

      case "user_set_active":
        result = await apiClient.setUserActive(
          args.companyId as string | undefined,
          args.userId as string,
          args.isActive as boolean,
        );
        break;

      // Company
      case "company_get":
        result = await apiClient.getCompany(
          args.companyId as string | undefined,
        );
        break;

      case "company_stats":
        result = await apiClient.getCompanyStats(
          args.companyId as string | undefined,
        );
        break;

      case "company_vectors":
        result = await apiClient.getCompanyVectors(
          args.companyId as string | undefined,
          {
            page: args.page as number | undefined,
            limit: args.limit as number | undefined,
          },
        );
        break;

      // Admin
      case "consistency_check":
        result = await apiClient.triggerConsistencyCheck(
          args.companyId as string | undefined,
        );
        break;

      case "cache_clear":
        result = await apiClient.clearCache(
          args.companyId as string | undefined,
        );
        break;

      case "job_status":
        result = await apiClient.getJobStatus(args.jobId as string);
        break;

      case "job_consistency_status":
        result = await apiClient.getConsistencyCheckJobStatus(
          args.jobId as string,
        );
        break;

      case "health_check":
        result = await apiClient.healthCheck();
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
    };
  }
}

// Create and configure the server
const server = new Server(
  {
    name: "rag-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return handleToolCall(
    request.params.name,
    request.params.arguments as Record<string, unknown>,
  );
});

// Start the server
async function main(): Promise<void> {
  // Try to initialize authentication if credentials are provided
  const hasCredentials = config.email && config.password;
  const hasToken = config.token;

  if (hasCredentials || hasToken) {
    try {
      await apiClient.initialize();
      const authState = apiClient.getAuthState();
      console.error(
        `RAG MCP Server: Authenticated as ${authState?.user?.email || "user"} (Company: ${authState?.companyId || "unknown"})`,
      );
    } catch (error) {
      console.error(
        "RAG MCP Server: Failed to initialize authentication:",
        error instanceof Error ? error.message : error,
      );
      console.error(
        "RAG MCP Server: You can still use auth_login tool to authenticate later.",
      );
    }
  } else {
    console.error(
      "RAG MCP Server: No credentials provided. Use auth_login tool to authenticate.",
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RAG MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
