import { z } from 'zod';

/**
 * Conversation message role
 */
export const ConversationMessageRoleSchema = z.enum(['user', 'assistant']);
export type ConversationMessageRole = z.infer<typeof ConversationMessageRoleSchema>;

/**
 * Conversation message structure
 */
export const ConversationMessageSchema = z.object({
  id: z.string(),
  role: ConversationMessageRoleSchema,
  content: z.string().min(1),
  sources: z
    .array(
      z.object({
        fileId: z.string(),
        fileName: z.string().optional(),
        projectId: z.string().optional(),
        projectName: z.string().optional(),
        chunkIndex: z.number(),
        content: z.string(),
        score: z.number(),
      })
    )
    .optional(),
  timestamp: z.coerce.date(),
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

/**
 * Cached context for a conversation
 */
export const CachedContextSchema = z.object({
  sources: z.array(
    z.object({
      fileId: z.string(),
      fileName: z.string().optional(),
      projectId: z.string().optional(),
      projectName: z.string().optional(),
      chunkIndex: z.number(),
      content: z.string(),
      score: z.number(),
    })
  ),
  query: z.string(), // Original query that generated this context
  contextString: z.string(), // Formatted context string for LLM
  retrievedAt: z.coerce.date(), // When this context was retrieved
  expiresAt: z.coerce.date(), // When this context should be refreshed
  fileIds: z.array(z.string()), // File IDs included in this context for tracking
});
export type CachedContext = z.infer<typeof CachedContextSchema>;

/**
 * Conversation interface
 */
export interface IConversation {
  _id: string;
  companyId: string;
  userId?: string;
  projectId?: string;

  // Conversation Info
  title: string;
  messages: ConversationMessage[];

  // Metadata
  messageCount: number;
  lastMessageAt: Date;

  // Context Caching (for optimization)
  cachedContext?: CachedContext; // Reusable context for follow-up queries
  lastQueryEmbedding?: number[]; // Last query embedding for similarity checks

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Create conversation request schema
 */
export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  projectId: z.string().optional(),
  initialMessage: z.string().min(1).max(8000).trim().optional(),
});
export type CreateConversationDTO = z.infer<typeof createConversationSchema>;

/**
 * Update conversation request schema
 */
export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
});
export type UpdateConversationDTO = z.infer<typeof updateConversationSchema>;

/**
 * Add message to conversation request schema
 */
export const addMessageSchema = z.object({
  role: ConversationMessageRoleSchema,
  content: z.string().min(1).max(32000),
  sources: z
    .array(
      z.object({
        fileId: z.string(),
        fileName: z.string().optional(),
        projectId: z.string().optional(),
        projectName: z.string().optional(),
        chunkIndex: z.number(),
        content: z.string(),
        score: z.number(),
      })
    )
    .optional(),
});
export type AddMessageDTO = z.infer<typeof addMessageSchema>;

/**
 * Conversation ID param schema
 */
export const conversationIdSchema = z.object({
  conversationId: z.string().min(1),
});
