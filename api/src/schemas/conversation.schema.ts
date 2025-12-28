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
