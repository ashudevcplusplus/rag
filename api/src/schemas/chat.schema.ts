import { z } from 'zod';

/**
 * Chat message role
 */
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/**
 * Chat message structure
 */
export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().min(1).max(32000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Available prompt template types
 * These correspond to pre-built system prompts optimized for different use cases
 */
export const PromptTemplateTypeSchema = z.enum([
  'customer_support', // Default - balanced customer service
  'sales_assistant', // Sales-focused with lead generation
  'technical_support', // Technical documentation and troubleshooting
  'onboarding_assistant', // New user onboarding
  'faq_concise', // Brief FAQ-style responses
  'ecommerce_assistant', // E-commerce product assistant
]);
export type PromptTemplateType = z.infer<typeof PromptTemplateTypeSchema>;

/**
 * Chat request validation schema
 */
export const chatRequestSchema = z.object({
  // The user's question/prompt
  query: z.string().min(1).max(8000).trim(),

  // Project ID is REQUIRED - all chat operations must be scoped to a project
  projectId: z.string().min(1, 'projectId is required'),

  // Optional conversation ID for context caching (enables smart context reuse)
  conversationId: z.string().optional(),

  // Optional conversation history for multi-turn chat
  messages: z.array(ChatMessageSchema).optional(),

  // System prompt configuration (choose ONE approach):
  // Option 1: Use a predefined template by name
  promptTemplate: PromptTemplateTypeSchema.optional(),
  // Option 2: Provide a custom system prompt (overrides template if both provided)
  systemPrompt: z.string().max(8000).optional(),

  // RAG settings
  limit: z.number().int().min(1).max(50).optional().default(5),
  rerank: z.boolean().optional().default(true),

  // Additional filter options for RAG search (projectId is already required above)
  filter: z
    .object({
      fileId: z.string().optional(),
      fileIds: z.array(z.string()).optional(),
    })
    .optional(),

  // LLM provider override
  llmProvider: z.enum(['openai', 'gemini']).optional(),

  // Embedding provider override for RAG search
  embeddingProvider: z.enum(['openai', 'gemini']).optional(),

  // Response settings
  maxTokens: z.number().int().min(100).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),

  // Include sources in response
  includeSources: z.boolean().optional().default(true),

  // Stream response (for future implementation)
  stream: z.boolean().optional().default(false),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Source chunk included in chat response
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

/**
 * SSE streaming event types
 */
export type StreamEventType = 'sources' | 'token' | 'done' | 'error' | 'cache_hit';

/**
 * SSE streaming event structure
 */
export interface StreamEvent {
  type: StreamEventType;
  data: StreamEventData;
}

export type StreamEventData =
  | { sources: ChatSource[] } // type: 'sources'
  | { token: string } // type: 'token'
  | {
      // type: 'done'
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
      model: string;
      provider: 'openai' | 'gemini';
    }
  | { message: string } // type: 'error'
  | { reason: string }; // type: 'cache_hit'
