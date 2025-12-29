import { z } from 'zod';

/**
 * ChatV2 - Enhanced chat schema with advanced features
 */

/**
 * Chat message role
 */
export const MessageRoleSchemaV2 = z.enum(['user', 'assistant', 'system']);
export type MessageRoleV2 = z.infer<typeof MessageRoleSchemaV2>;

/**
 * Chat message structure
 */
export const ChatMessageSchemaV2 = z.object({
  role: MessageRoleSchemaV2,
  content: z.string().min(1).max(32000),
});
export type ChatMessageV2 = z.infer<typeof ChatMessageSchemaV2>;

/**
 * Available prompt template types for V2
 */
export const PromptTemplateTypeSchemaV2 = z.enum([
  'customer_support',
  'sales_assistant',
  'technical_support',
  'onboarding_assistant',
  'faq_concise',
  'ecommerce_assistant',
  'research_assistant', // NEW: For research and analysis
  'code_assistant', // NEW: For code-related queries
]);
export type PromptTemplateTypeV2 = z.infer<typeof PromptTemplateTypeSchemaV2>;

/**
 * Search mode for RAG
 */
export const SearchModeSchema = z.enum([
  'smart', // Uses Smart Agent with multi-query search
  'fast', // Single query, no reranking
  'deep', // Maximum retrieval with extensive reranking
]);
export type SearchMode = z.infer<typeof SearchModeSchema>;

/**
 * Response format options
 */
export const ResponseFormatSchema = z.enum([
  'text', // Plain text response
  'markdown', // Markdown formatted response
  'structured', // JSON structured response with sections
]);
export type ResponseFormat = z.infer<typeof ResponseFormatSchema>;

/**
 * ChatV2 request validation schema - Enhanced with more options
 */
export const chatV2RequestSchema = z.object({
  // The user's question/prompt
  query: z.string().min(1).max(8000).trim(),

  // Project ID is REQUIRED - all chat operations must be scoped to a project
  projectId: z.string().min(1, 'projectId is required'),

  // Optional conversation history for multi-turn chat
  messages: z.array(ChatMessageSchemaV2).optional(),

  // System prompt configuration
  promptTemplate: PromptTemplateTypeSchemaV2.optional(),
  systemPrompt: z.string().max(8000).optional(),

  // === NEW V2 Features ===

  // Search mode: smart (default), fast, or deep
  searchMode: SearchModeSchema.optional().default('smart'),

  // Response format: text, markdown, or structured
  responseFormat: ResponseFormatSchema.optional().default('markdown'),

  // Include reasoning/thinking in response
  includeReasoning: z.boolean().optional().default(false),

  // Language for response (ISO 639-1 code)
  language: z.string().length(2).optional(),

  // Maximum sources to cite in answer
  maxCitations: z.number().int().min(1).max(20).optional().default(5),

  // Enable/disable context expansion
  expandContext: z.boolean().optional().default(true),

  // === RAG Settings ===
  limit: z.number().int().min(1).max(50).optional().default(10),
  rerank: z.boolean().optional().default(true),

  // Additional filter options for RAG search (projectId is already required above)
  filter: z
    .object({
      fileId: z.string().optional(),
      fileIds: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(), // Filter by tags
    })
    .optional(),

  // === LLM Settings ===
  llmProvider: z.enum(['openai', 'gemini']).optional(),
  embeddingProvider: z.enum(['openai', 'gemini']).optional(),
  maxTokens: z.number().int().min(100).max(8192).optional(), // Increased max
  temperature: z.number().min(0).max(2).optional(),

  // === Response Settings ===
  includeSources: z.boolean().optional().default(true),
  includeMetadata: z.boolean().optional().default(false), // NEW: Include detailed metadata
  stream: z.boolean().optional().default(false),
});

export type ChatV2Request = z.infer<typeof chatV2RequestSchema>;

/**
 * Source chunk included in chat response (enhanced)
 */
export interface ChatV2Source {
  fileId: string;
  fileName: string;
  projectId?: string;
  projectName?: string;
  chunkIndex: number;
  content: string;
  score: number;
  // NEW fields
  highlight?: string; // Highlighted relevant portion
  citationNumber?: number; // Citation number in answer
  relevanceExplanation?: string; // Why this source was selected
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
 * ChatV2 response structure (enhanced)
 */
export interface ChatV2Response {
  answer: string;
  sources: ChatV2Source[];

  // NEW fields
  queryAnalysis?: QueryAnalysis; // How the query was interpreted
  reasoning?: string; // Thinking/reasoning process
  suggestedFollowUps?: string[]; // Suggested follow-up questions
  confidence?: number; // Overall confidence in the answer
  responseFormat: ResponseFormat;

  // Metadata
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: 'openai' | 'gemini';
  searchMode: SearchMode;
  processingTime?: number; // Total processing time in ms
}

/**
 * SSE streaming event types for V2
 */
export type StreamV2EventType =
  | 'analysis' // Query analysis event
  | 'sources'
  | 'reasoning' // Reasoning/thinking event
  | 'token'
  | 'followups' // Suggested follow-ups
  | 'done'
  | 'error';

/**
 * SSE streaming event structure for V2
 */
export interface StreamV2Event {
  type: StreamV2EventType;
  data: StreamV2EventData;
}

export type StreamV2EventData =
  | { analysis: QueryAnalysis } // type: 'analysis'
  | { sources: ChatV2Source[] } // type: 'sources'
  | { reasoning: string } // type: 'reasoning'
  | { token: string } // type: 'token'
  | { followups: string[] } // type: 'followups'
  | {
      // type: 'done'
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
      model: string;
      provider: 'openai' | 'gemini';
      confidence?: number;
      processingTime?: number;
    }
  | { message: string }; // type: 'error'
