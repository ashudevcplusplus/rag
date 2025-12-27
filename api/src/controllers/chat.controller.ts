import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { chatRequestSchema } from '../schemas/chat.schema';
import { companyIdSchema } from '../validators/upload.validator';
import { logger } from '../utils/logger';
import { publishAnalytics } from '../utils/async-events.util';
import { AnalyticsEventType, EventSource } from '../types/enums';
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
    stream: chatRequest.stream,
  });

  // If streaming is requested, use the streaming endpoint
  if (chatRequest.stream) {
    // Publish analytics event for streaming
    void publishAnalytics({
      source: EventSource.CHAT_CONTROLLER_CHAT,
      eventType: AnalyticsEventType.SEARCH,
      companyId,
      metadata: {
        type: 'chat_stream',
        queryLength: chatRequest.query.length,
        limit: chatRequest.limit,
        rerank: chatRequest.rerank,
        llmProvider: chatRequest.llmProvider || 'openai',
      },
    });

    // Handle streaming - this will set headers and stream response
    await ChatService.chatStream(companyId, chatRequest, res);
    return;
  }

  // Process non-streaming chat request
  const response = await ChatService.chat(companyId, chatRequest);

  // Publish analytics event
  void publishAnalytics({
    source: EventSource.CHAT_CONTROLLER_CHAT,
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

/**
 * Streaming chat endpoint - RAG-powered Q&A with SSE streaming
 * POST /v1/companies/:companyId/chat/stream
 *
 * Same as /chat but always streams the response via Server-Sent Events.
 * Useful when you want to explicitly use the streaming endpoint.
 *
 * SSE Events:
 * - sources: Sent first with retrieved context chunks
 * - token: Sent for each token from the LLM
 * - done: Sent when generation is complete (includes usage stats)
 * - error: Sent if an error occurs
 */
export const chatStream = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate company ID
  const { companyId } = companyIdSchema.parse(req.params);

  // Validate request body (force stream to true)
  const chatRequest = chatRequestSchema.parse({ ...req.body, stream: true });

  logger.info('Streaming chat request received', {
    companyId,
    queryLength: chatRequest.query.length,
    hasHistory: !!(chatRequest.messages && chatRequest.messages.length > 0),
    limit: chatRequest.limit,
    rerank: chatRequest.rerank,
    llmProvider: chatRequest.llmProvider,
    embeddingProvider: chatRequest.embeddingProvider,
  });

  // Publish analytics event
  void publishAnalytics({
    source: EventSource.CHAT_CONTROLLER_STREAM,
    eventType: AnalyticsEventType.SEARCH,
    companyId,
    metadata: {
      type: 'chat_stream',
      queryLength: chatRequest.query.length,
      limit: chatRequest.limit,
      rerank: chatRequest.rerank,
      llmProvider: chatRequest.llmProvider || 'openai',
    },
  });

  // Handle streaming
  await ChatService.chatStream(companyId, chatRequest, res);
});
