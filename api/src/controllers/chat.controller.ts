import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { chatRequestSchema } from '../schemas/chat.schema';
import { companyIdSchema } from '../validators/upload.validator';
import { logger } from '../utils/logger';
import { publishAnalytics } from '../utils/async-events.util';
import { AnalyticsEventType } from '../types/enums';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Chat endpoint - RAG-powered Q&A
 * POST /v1/companies/:companyId/chat
 *
 * Retrieves relevant context from the vector store,
 * arranges chunks coherently, and sends to LLM for answer generation.
 */
export const chat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  // Validate company ID
  const { companyId } = companyIdSchema.parse(req.params);

  // Validate request body
  const chatRequest = chatRequestSchema.parse(req.body);

  logger.info('Chat request received', {
    companyId,
    queryLength: chatRequest.query.length,
    hasHistory: !!(chatRequest.messages && chatRequest.messages.length > 0),
    limit: chatRequest.limit,
    rerank: chatRequest.rerank,
    llmProvider: chatRequest.llmProvider,
    embeddingProvider: chatRequest.embeddingProvider,
  });

  // Process chat request
  const response = await ChatService.chat(companyId, chatRequest);

  // Publish analytics event
  void publishAnalytics({
    eventType: AnalyticsEventType.SEARCH, // Reuse search event type for chat
    companyId,
    metadata: {
      type: 'chat',
      queryLength: chatRequest.query.length,
      limit: chatRequest.limit,
      rerank: chatRequest.rerank,
      llmProvider: response.provider,
      sourcesCount: response.sources.length,
      answerLength: response.answer.length,
      usage: response.usage,
      duration: Date.now() - startTime,
    },
  });

  res.json(response);
});
