import { Request, Response } from 'express';
import { SmartAgentV2Service } from '../services/smart-agent-v2.service';
import { chatV2RequestSchema } from '../schemas/chat-v2.schema';
import { companyIdSchema } from '../validators/upload.validator';
import { logger } from '../utils/logger';
import { publishAnalytics } from '../utils/async-events.util';
import { AnalyticsEventType, EventSource } from '@rag/types';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * ChatV2 - Enhanced RAG-powered Q&A endpoint
 * POST /v1/companies/:companyId/chat/v2
 *
 * This is a completely separate implementation from V1.
 * Uses SmartAgentV2Service exclusively.
 *
 * Features:
 * - Multiple search modes (smart, fast, deep)
 * - Response format options (text, markdown, structured)
 * - Query analysis and reasoning
 * - Suggested follow-up questions
 * - Confidence scoring
 * - Enhanced metadata
 */
export const chatV2 = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  // Validate company ID
  const { companyId } = companyIdSchema.parse(req.params);

  // Validate request body
  const request = chatV2RequestSchema.parse(req.body);

  logger.info('ChatV2 request received', {
    companyId,
    projectId: request.projectId,
    queryLength: request.query.length,
    searchMode: request.searchMode,
    responseFormat: request.responseFormat,
    includeReasoning: request.includeReasoning,
    hasHistory: !!(request.messages && request.messages.length > 0),
  });

  // Handle streaming separately
  if (request.stream) {
    await handleStreamingV2(companyId, request, res, startTime);
    return;
  }

  // Process using SmartAgentV2Service
  const response = await SmartAgentV2Service.chat(companyId, request);

  // Publish analytics
  void publishAnalytics({
    source: EventSource.CHAT_CONTROLLER_CHAT,
    eventType: AnalyticsEventType.SEARCH,
    companyId,
    metadata: {
      type: 'chat_v2',
      projectId: request.projectId,
      searchMode: request.searchMode,
      responseFormat: request.responseFormat,
      queryLength: request.query.length,
      sourcesCount: response.sources.length,
      answerLength: response.answer.length,
      confidence: response.confidence,
      processingTime: response.processingTime,
      usage: response.usage,
    },
  });

  res.json(response);
});

/**
 * Handle streaming responses for V2
 * Uses true OpenAI streaming for real-time token delivery
 */
async function handleStreamingV2(
  companyId: string,
  request: ReturnType<typeof chatV2RequestSchema.parse>,
  res: Response,
  _startTime: number
): Promise<void> {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Flush headers immediately to prevent proxy buffering
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown): void => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Use true OpenAI streaming via SmartAgentV2Service.chatStream
    await SmartAgentV2Service.chatStream(
      companyId,
      {
        ...request,
        includeMetadata: request.includeMetadata ?? true, // Enable metadata for streaming
      },
      (event) => {
        // Forward each event to the client
        sendEvent(event.type, event.data);
      }
    );

    res.end();
  } catch (error) {
    logger.error('ChatV2 streaming error', { companyId, error });
    sendEvent('error', {
      message: error instanceof Error ? error.message : 'Streaming failed',
    });
    res.end();
  }
}

/**
 * ChatV2 Stream endpoint - Dedicated streaming
 * POST /v1/companies/:companyId/chat/v2/stream
 */
export const chatV2Stream = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  // Validate company ID
  const { companyId } = companyIdSchema.parse(req.params);

  // Validate request body and force streaming
  const request = chatV2RequestSchema.parse({ ...req.body, stream: true });

  logger.info('ChatV2 streaming request received', {
    companyId,
    projectId: request.projectId,
    queryLength: request.query.length,
    searchMode: request.searchMode,
  });

  await handleStreamingV2(companyId, request, res, startTime);
});
