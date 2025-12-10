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
 * Chat request validation schema
 */
export const chatRequestSchema = z.object({
  // The user's question/prompt
  query: z.string().min(1).max(8000).trim(),

  // Optional conversation history for multi-turn chat
  messages: z.array(ChatMessageSchema).optional(),

  // Optional system prompt to guide the LLM
  systemPrompt: z.string().max(4000).optional(),

  // RAG settings
  limit: z.number().int().min(1).max(50).optional().default(5),
  rerank: z.boolean().optional().default(true),

  // Filter options for RAG search
  filter: z
    .object({
      fileId: z.string().optional(),
      fileIds: z.array(z.string()).optional(),
      projectId: z.string().optional(),
    })
    .optional(),

  // LLM provider override
  llmProvider: z.enum(['openai', 'gemini']).optional(),

  // Embedding provider override for RAG search
  embeddingProvider: z.enum(['inhouse', 'openai', 'gemini']).optional(),

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
