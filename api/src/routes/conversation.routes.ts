import { Router } from 'express';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  addMessage,
  updateMessage,
  clearMessages,
} from '../controllers/conversation.controller';

const router = Router({ mergeParams: true });

/**
 * GET /v1/companies/:companyId/conversations
 * List all conversations for a company
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - projectId: string (optional) - filter by project
 */
router.get('/', listConversations);

/**
 * POST /v1/companies/:companyId/conversations
 * Create a new conversation
 *
 * Request body:
 * - title: string (optional, default: "New Conversation")
 * - projectId: string (optional) - associate with a project
 */
router.post('/', createConversation);

/**
 * GET /v1/companies/:companyId/conversations/:conversationId
 * Get a single conversation with all messages
 */
router.get('/:conversationId', getConversation);

/**
 * PATCH /v1/companies/:companyId/conversations/:conversationId
 * Update conversation metadata (e.g., title)
 *
 * Request body:
 * - title: string (optional)
 */
router.patch('/:conversationId', updateConversation);

/**
 * DELETE /v1/companies/:companyId/conversations/:conversationId
 * Delete a conversation (soft delete)
 */
router.delete('/:conversationId', deleteConversation);

/**
 * POST /v1/companies/:companyId/conversations/:conversationId/messages
 * Add a message to a conversation
 *
 * Request body:
 * - role: 'user' | 'assistant'
 * - content: string
 * - sources: array (optional) - for assistant messages with RAG sources
 */
router.post('/:conversationId/messages', addMessage);

/**
 * PATCH /v1/companies/:companyId/conversations/:conversationId/messages/:messageId
 * Update a message (for streaming updates)
 *
 * Request body:
 * - content: string (optional)
 * - sources: array (optional)
 */
router.patch('/:conversationId/messages/:messageId', updateMessage);

/**
 * DELETE /v1/companies/:companyId/conversations/:conversationId/messages
 * Clear all messages from a conversation
 */
router.delete('/:conversationId/messages', clearMessages);

export default router;
