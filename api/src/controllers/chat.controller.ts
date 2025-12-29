import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import {
  chatRequestSchema,
  getChunkContextRequestSchema,
  DocumentChunksResponse,
  ChunkContextResponse,
} from '../schemas/chat.schema';
import { companyIdSchema } from '../validators/upload.validator';
import { logger } from '../utils/logger';
import { publishAnalytics } from '../utils/async-events.util';
import { AnalyticsEventType, EventSource } from '@rag/types';
import { asyncHandler } from '../middleware/error.middleware';
import { embeddingRepository } from '../repositories/embedding.repository';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { NotFoundError } from '../types/error.types';

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

/**
 * Get all chunks of a document
 * GET /v1/companies/:companyId/documents/:fileId/chunks
 *
 * Returns all chunks of a document, useful when the agent needs
 * to read the full document content.
 */
export const getDocumentChunks = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate company ID
    const { companyId } = companyIdSchema.parse(req.params);
    const { fileId } = req.params;

    logger.info('Get document chunks request', { companyId, fileId });

    // Get file metadata to verify it exists and belongs to this company
    const file = await fileMetadataRepository.findById(fileId);
    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Get all chunks
    const chunks = await embeddingRepository.findAllChunksByFileId(fileId);
    if (!chunks) {
      throw new NotFoundError('Document chunks not found. File may not be indexed yet.');
    }

    const response: DocumentChunksResponse = {
      fileId,
      fileName: file.originalFilename || file.filename,
      projectId: file.projectId,
      totalChunks: chunks.length,
      chunks,
      fullContent: chunks.map((c) => c.content).join('\n\n'),
    };

    res.json(response);
  }
);

/**
 * Get neighboring chunks around a specific chunk (context window)
 * GET /v1/companies/:companyId/documents/:fileId/chunks/:chunkIndex/context
 *
 * Returns the target chunk along with surrounding chunks for context.
 * Useful when the agent needs more context around a retrieved chunk.
 *
 * Query params:
 * - windowSize: number (optional, default: 2) - Number of chunks before and after to include
 */
export const getChunkContext = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate company ID
  const { companyId } = companyIdSchema.parse(req.params);
  const { fileId, chunkIndex: chunkIndexStr } = req.params;

  // Parse and validate request
  const chunkIndex = parseInt(chunkIndexStr, 10);
  const windowSize = parseInt(req.query.windowSize as string, 10) || 2;

  getChunkContextRequestSchema.parse({ chunkIndex, windowSize });

  logger.info('Get chunk context request', { companyId, fileId, chunkIndex, windowSize });

  // Get file metadata to verify it exists
  const file = await fileMetadataRepository.findById(fileId);
  if (!file) {
    throw new NotFoundError('File not found');
  }

  // Get total chunk count
  const totalChunks = await embeddingRepository.getChunkCount(fileId);
  if (totalChunks === null) {
    throw new NotFoundError('Document chunks not found. File may not be indexed yet.');
  }

  // Calculate range
  const startIndex = Math.max(0, chunkIndex - windowSize);
  const endIndex = Math.min(totalChunks - 1, chunkIndex + windowSize);

  // Get chunk range
  const chunks = await embeddingRepository.findChunkRange(fileId, startIndex, endIndex);
  if (!chunks || chunks.length === 0) {
    throw new NotFoundError('Chunks not found for the specified range');
  }

  const response: ChunkContextResponse = {
    fileId,
    fileName: file.originalFilename || file.filename,
    projectId: file.projectId,
    targetChunkIndex: chunkIndex,
    totalChunks,
    windowSize,
    chunks,
    combinedContent: chunks.map((c) => c.content).join('\n\n'),
  };

  res.json(response);
});
