import { Request, Response } from 'express';
import { conversationRepository } from '../repositories/conversation.repository';
import {
  createConversationSchema,
  updateConversationSchema,
  addMessageSchema,
  conversationIdSchema,
  ConversationMessage,
} from '../schemas/conversation.schema';
import { companyIdSchema } from '../validators/upload.validator';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/error.middleware';
import { z } from 'zod';

/**
 * List conversations
 * GET /v1/companies/:companyId/conversations
 */
export const listConversations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = companyIdSchema.parse(req.params);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const projectId = req.query.projectId as string | undefined;

    logger.debug('Listing conversations', { companyId, page, limit, projectId });

    const result = await conversationRepository.list(companyId, page, limit, { projectId });

    res.json({
      conversations: result.conversations,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      },
    });
  }
);

/**
 * Get a single conversation
 * GET /v1/companies/:companyId/conversations/:conversationId
 */
export const getConversation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = companyIdSchema.parse(req.params);
  const { conversationId } = conversationIdSchema.parse(req.params);

  const conversation = await conversationRepository.findByIdAndCompany(conversationId, companyId);

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.json({ conversation });
});

/**
 * Create a new conversation
 * POST /v1/companies/:companyId/conversations
 */
export const createConversation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = companyIdSchema.parse(req.params);
    const data = createConversationSchema.parse(req.body);

    logger.info('Creating conversation', {
      companyId,
      title: data.title,
      projectId: data.projectId,
    });

    const conversation = await conversationRepository.create(companyId, data);

    res.status(201).json({ conversation });
  }
);

/**
 * Update a conversation
 * PATCH /v1/companies/:companyId/conversations/:conversationId
 */
export const updateConversation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = companyIdSchema.parse(req.params);
    const { conversationId } = conversationIdSchema.parse(req.params);
    const data = updateConversationSchema.parse(req.body);

    logger.info('Updating conversation', { companyId, conversationId, updates: data });

    const conversation = await conversationRepository.update(conversationId, companyId, data);

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json({ conversation });
  }
);

/**
 * Delete a conversation
 * DELETE /v1/companies/:companyId/conversations/:conversationId
 */
export const deleteConversation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { companyId } = companyIdSchema.parse(req.params);
    const { conversationId } = conversationIdSchema.parse(req.params);

    logger.info('Deleting conversation', { companyId, conversationId });

    const deleted = await conversationRepository.delete(conversationId, companyId);

    if (!deleted) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.status(204).send();
  }
);

/**
 * Add a message to a conversation
 * POST /v1/companies/:companyId/conversations/:conversationId/messages
 */
export const addMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = companyIdSchema.parse(req.params);
  const { conversationId } = conversationIdSchema.parse(req.params);
  const data = addMessageSchema.parse(req.body);

  const message: ConversationMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: data.role,
    content: data.content,
    sources: data.sources,
    timestamp: new Date(),
  };

  logger.debug('Adding message to conversation', {
    companyId,
    conversationId,
    role: message.role,
    contentLength: message.content.length,
  });

  const conversation = await conversationRepository.addMessage(conversationId, companyId, message);

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.json({ message, conversation });
});

/**
 * Update a message in a conversation (for streaming updates)
 * PATCH /v1/companies/:companyId/conversations/:conversationId/messages/:messageId
 */
export const updateMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = companyIdSchema.parse(req.params);
  const { conversationId } = conversationIdSchema.parse(req.params);
  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(req.params);
  const updates = addMessageSchema.partial().parse(req.body);

  logger.debug('Updating message in conversation', {
    companyId,
    conversationId,
    messageId,
  });

  const conversation = await conversationRepository.updateLastMessage(
    conversationId,
    companyId,
    messageId,
    updates
  );

  if (!conversation) {
    res.status(404).json({ error: 'Conversation or message not found' });
    return;
  }

  res.json({ conversation });
});

/**
 * Clear all messages from a conversation
 * DELETE /v1/companies/:companyId/conversations/:conversationId/messages
 */
export const clearMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { companyId } = companyIdSchema.parse(req.params);
  const { conversationId } = conversationIdSchema.parse(req.params);

  logger.info('Clearing conversation messages', { companyId, conversationId });

  const cleared = await conversationRepository.clearMessages(conversationId, companyId);

  if (!cleared) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.json({ message: 'Messages cleared' });
});
