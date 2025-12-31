import { Request, Response } from 'express';
import { SmartAgentV2Service } from '../../../src/services/smart-agent-v2.service';
import { chatV2RequestSchema } from '../../../src/schemas/chat-v2.schema';
import { companyIdSchema } from '../../../src/validators/upload.validator';
import { publishAnalytics } from '../../../src/utils/async-events.util';
import { AnalyticsEventType, EventSource } from '@rag/types';
import { asyncHandler } from '../../../src/middleware/error.middleware';
import {
  createMockResponse,
  createMockRequest,
  createMockAuthenticatedRequest,
  createMockCompany,
  MockExpressResponse,
} from '../../lib/mock-utils';

// Mock dependencies
jest.mock('../../../src/services/smart-agent-v2.service');
jest.mock('../../../src/schemas/chat-v2.schema');
jest.mock('../../../src/validators/upload.validator');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../../src/utils/async-events.util');
jest.mock('../../../src/middleware/error.middleware');

describe('ChatV2Controller', () => {
  let mockRes: MockExpressResponse;
  const mockNext = jest.fn();
  const mockAsyncHandler = asyncHandler as jest.MockedFunction<typeof asyncHandler>;
  const mockPublishAnalytics = publishAnalytics as jest.MockedFunction<typeof publishAnalytics>;
  const mockSmartAgentV2Service = SmartAgentV2Service as jest.MockedClass<
    typeof SmartAgentV2Service
  >;
  const mockChatV2RequestSchema = chatV2RequestSchema as jest.MockedFunction<
    typeof chatV2RequestSchema
  >;
  const mockCompanyIdSchema = companyIdSchema as jest.MockedFunction<typeof companyIdSchema>;

  // Import functions using require to avoid asyncHandler wrapping issues
  const { chatV2, chatV2Stream } = require('../../../src/controllers/chat-v2.controller');

  const companyId = 'company-123';
  const mockCompany = createMockCompany({ _id: companyId });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();

    // Reset all mocks to default behavior
    mockAsyncHandler.mockImplementation((fn: any) => fn);
    mockPublishAnalytics.mockResolvedValue(undefined);
    mockSmartAgentV2Service.chat.mockResolvedValue({
      answer: 'Test answer',
      sources: [],
      responseFormat: 'markdown' as const,
      model: 'gpt-4o-mini',
      provider: 'openai' as const,
      searchMode: 'smart' as const,
      processingTime: 100,
    });
    mockSmartAgentV2Service.chatStream.mockResolvedValue(undefined);

    mockChatV2RequestSchema.parse.mockImplementation((data: any) => data);
    mockCompanyIdSchema.parse.mockReturnValue({ companyId });
  });

  describe('chatV2', () => {
    const validRequestBody = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
      searchMode: 'smart' as const,
    };

    it('should process chat request successfully', async () => {
      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: validRequestBody,
      });

      const expectedResponse = {
        answer: 'Our refund policy allows returns within 30 days.',
        sources: [
          {
            fileId: 'file-1',
            fileName: 'policies.pdf',
            chunkIndex: 0,
            content: 'Refund policy content',
            score: 0.9,
            citationNumber: 1,
          },
        ],
        responseFormat: 'markdown' as const,
        model: 'gpt-4o-mini',
        provider: 'openai' as const,
        searchMode: 'smart' as const,
        processingTime: 150,
        confidence: 0.85,
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      mockSmartAgentV2Service.chat.mockResolvedValue(expectedResponse);

      await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockCompanyIdSchema.parse).toHaveBeenCalledWith({ companyId });
      expect(mockChatV2RequestSchema.parse).toHaveBeenCalledWith(validRequestBody);
      expect(mockSmartAgentV2Service.chat).toHaveBeenCalledWith(companyId, validRequestBody);
      expect(mockPublishAnalytics).toHaveBeenCalledWith({
        source: EventSource.CHAT_CONTROLLER_CHAT,
        eventType: AnalyticsEventType.SEARCH,
        companyId,
        metadata: {
          type: 'chat_v2',
          projectId: 'project-456',
          searchMode: 'smart' as const,
          responseFormat: 'markdown' as const,
          queryLength: validRequestBody.query.length,
          sourcesCount: 1,
          answerLength: expectedResponse.answer.length,
          confidence: 0.85,
          processingTime: 150,
          usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        },
      });
      expect(mockRes.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle streaming requests by calling handleStreamingV2', async () => {
      const streamingRequestBody = {
        ...validRequestBody,
        stream: true,
      };

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: streamingRequestBody,
      });

      // Mock the handleStreamingV2 function
      const mockHandleStreamingV2 = jest.fn();
      jest.doMock('../../../src/controllers/chat-v2.controller', () => ({
        chatV2: jest.fn(),
        chatV2Stream: jest.fn(),
        handleStreamingV2: mockHandleStreamingV2,
      }));

      // Re-import after mocking
      const { chatV2: mockedChatV2 } = require('../../../src/controllers/chat-v2.controller');

      await mockedChatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockHandleStreamingV2).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining(streamingRequestBody),
        mockRes,
        expect.any(Number)
      );
    });

    it('should handle validation errors from companyId schema', async () => {
      const validationError = new Error('Invalid company ID');
      mockCompanyIdSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      const mockReq = createMockRequest({
        params: { companyId: 'invalid' },
        body: validRequestBody,
      });

      await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(validationError);
      expect(mockSmartAgentV2Service.chat).not.toHaveBeenCalled();
    });

    it('should handle validation errors from request schema', async () => {
      const validationError = new Error('Invalid request body');
      mockChatV2RequestSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: { invalid: 'data' },
      });

      await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(validationError);
      expect(mockSmartAgentV2Service.chat).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('SmartAgent service failed');
      mockSmartAgentV2Service.chat.mockRejectedValue(serviceError);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: validRequestBody,
      });

      await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockPublishAnalytics).not.toHaveBeenCalled();
    });

    it('should publish analytics even when response lacks some metadata', async () => {
      const minimalResponse = {
        answer: 'Test answer',
        sources: [],
        responseFormat: 'markdown' as const,
        model: 'gpt-4o-mini',
        provider: 'openai' as const,
        searchMode: 'fast' as const,
        processingTime: 50,
      };

      mockSmartAgentV2Service.chat.mockResolvedValue(minimalResponse);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: validRequestBody,
      });

      await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockPublishAnalytics).toHaveBeenCalledWith({
        source: EventSource.CHAT_CONTROLLER_CHAT,
        eventType: AnalyticsEventType.SEARCH,
        companyId,
        metadata: {
          type: 'chat_v2',
          projectId: 'project-456',
          searchMode: 'fast',
          responseFormat: 'markdown' as const,
          queryLength: validRequestBody.query.length,
          sourcesCount: 0,
          answerLength: minimalResponse.answer.length,
          confidence: undefined,
          processingTime: 50,
          usage: undefined,
        },
      });
    });
  });

  describe('chatV2Stream', () => {
    const validRequestBody = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
      searchMode: 'smart' as const,
    };

    it('should process streaming chat request successfully', async () => {
      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: validRequestBody,
      });

      // Mock the handleStreamingV2 function
      const mockHandleStreamingV2 = jest.fn();
      jest.doMock('../../../src/controllers/chat-v2.controller', () => ({
        chatV2: jest.fn(),
        chatV2Stream: jest.fn(),
        handleStreamingV2: mockHandleStreamingV2,
      }));

      // Re-import after mocking
      const {
        chatV2Stream: mockedChatV2Stream,
      } = require('../../../src/controllers/chat-v2.controller');

      await mockedChatV2Stream(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockCompanyIdSchema.parse).toHaveBeenCalledWith({ companyId });
      expect(mockChatV2RequestSchema.parse).toHaveBeenCalledWith({
        ...validRequestBody,
        stream: true,
      });
      expect(mockHandleStreamingV2).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ ...validRequestBody, stream: true }),
        mockRes,
        expect.any(Number)
      );
    });

    it('should handle validation errors in streaming endpoint', async () => {
      const validationError = new Error('Invalid request for streaming');
      mockChatV2RequestSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: { invalid: 'data' },
      });

      await chatV2Stream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(validationError);
    });

    it('should force stream=true in request parsing', async () => {
      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: { ...validRequestBody, stream: false }, // User tries to set stream: false
      });

      const mockHandleStreamingV2 = jest.fn();
      jest.doMock('../../../src/controllers/chat-v2.controller', () => ({
        chatV2: jest.fn(),
        chatV2Stream: jest.fn(),
        handleStreamingV2: mockHandleStreamingV2,
      }));

      // Re-import after mocking
      const {
        chatV2Stream: mockedChatV2Stream,
      } = require('../../../src/controllers/chat-v2.controller');

      await mockedChatV2Stream(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockChatV2RequestSchema.parse).toHaveBeenCalledWith({
        ...validRequestBody,
        stream: true,
      });
    });
  });

  describe('handleStreamingV2', () => {
    const validRequest = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
      searchMode: 'smart' as const,
      includeMetadata: true,
    };

    let mockHandleStreamingV2: jest.Mock;

    beforeEach(() => {
      // Mock the handleStreamingV2 function
      mockHandleStreamingV2 = jest.fn();
      jest.doMock('../../../src/controllers/chat-v2.controller', () => ({
        chatV2: jest.fn(),
        chatV2Stream: jest.fn(),
        handleStreamingV2: mockHandleStreamingV2,
      }));
    });

    it('should set up SSE headers correctly', async () => {
      const { handleStreamingV2 } = require('../../../src/controllers/chat-v2.controller');

      // Mock the streaming function to do nothing
      mockSmartAgentV2Service.chatStream.mockImplementation(async (companyId, request, onEvent) => {
        onEvent({ type: 'done', data: { processingTime: 100 } });
      });

      await handleStreamingV2(companyId, validRequest, mockRes as unknown as Response, Date.now());

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
      expect(mockRes.flushHeaders).toHaveBeenCalled();
    });

    it('should send events in correct SSE format', async () => {
      const { handleStreamingV2 } = require('../../../src/controllers/chat-v2.controller');

      mockSmartAgentV2Service.chatStream.mockImplementation(async (companyId, request, onEvent) => {
        onEvent({ type: 'analysis', data: { analysis: { intent: 'find_information' } } });
        onEvent({ type: 'sources', data: { sources: [] } });
        onEvent({ type: 'token', data: { token: 'Hello' } });
        onEvent({ type: 'done', data: { processingTime: 100 } });
      });

      await handleStreamingV2(companyId, validRequest, mockRes as unknown as Response, Date.now());

      expect(mockRes.write).toHaveBeenCalledWith(
        'event: analysis\ndata: {"analysis":{"intent":"find_information"}}\n\n'
      );
      expect(mockRes.write).toHaveBeenCalledWith('event: sources\ndata: {"sources":[]}\n\n');
      expect(mockRes.write).toHaveBeenCalledWith('event: token\ndata: {"token":"Hello"}\n\n');
      expect(mockRes.write).toHaveBeenCalledWith('event: done\ndata: {"processingTime":100}\n\n');
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should enable metadata for streaming requests', async () => {
      const { handleStreamingV2 } = require('../../../src/controllers/chat-v2.controller');

      const requestWithoutMetadata = { ...validRequest, includeMetadata: false };

      mockSmartAgentV2Service.chatStream.mockImplementation(async (companyId, request, onEvent) => {
        onEvent({ type: 'done', data: { processingTime: 100 } });
      });

      await handleStreamingV2(
        companyId,
        requestWithoutMetadata,
        mockRes as unknown as Response,
        Date.now()
      );

      expect(mockSmartAgentV2Service.chatStream).toHaveBeenCalledWith(
        companyId,
        { ...requestWithoutMetadata, includeMetadata: true },
        expect.any(Function)
      );
    });

    it('should publish streaming analytics correctly', async () => {
      const { handleStreamingV2 } = require('../../../src/controllers/chat-v2.controller');

      mockSmartAgentV2Service.chatStream.mockImplementation(async (companyId, request, onEvent) => {
        onEvent({ type: 'sources', data: { sources: [{}] } }); // 1 source
        onEvent({
          type: 'done',
          data: {
            usage: { promptTokens: 150, completionTokens: 75, totalTokens: 225 },
            confidence: 0.8,
            processingTime: 200,
          },
        });
      });

      await handleStreamingV2(companyId, validRequest, mockRes as unknown as Response, Date.now());

      expect(mockPublishAnalytics).toHaveBeenCalledWith({
        source: EventSource.CHAT_CONTROLLER_CHAT,
        eventType: AnalyticsEventType.SEARCH,
        companyId,
        metadata: {
          type: 'chat_v2_stream',
          projectId: 'project-456',
          searchMode: 'smart' as const,
          responseFormat: undefined,
          queryLength: validRequest.query.length,
          sourcesCount: 1,
          answerLength: 0, // Streaming doesn't track answer length
          confidence: 0.8,
          processingTime: 200,
          usage: { promptTokens: 150, completionTokens: 75, totalTokens: 225 },
        },
      });
    });

    it('should handle streaming errors gracefully', async () => {
      const { handleStreamingV2 } = require('../../../src/controllers/chat-v2.controller');

      const streamingError = new Error('Streaming failed');
      mockSmartAgentV2Service.chatStream.mockRejectedValue(streamingError);

      const validRequest = {
        query: 'What is the refund policy?',
        projectId: 'project-456',
        includeMetadata: true,
      };

      await handleStreamingV2(companyId, validRequest, mockRes as unknown as Response, Date.now());

      expect(mockRes.write).toHaveBeenCalledWith(
        'event: error\ndata: {"message":"Streaming failed"}\n\n'
      );
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should extract sources count from sources event for analytics', async () => {
      const { handleStreamingV2 } = require('../../../src/controllers/chat-v2.controller');

      mockSmartAgentV2Service.chatStream.mockImplementation(async (companyId, request, onEvent) => {
        onEvent({
          type: 'sources',
          data: {
            sources: [
              { fileId: 'file-1', fileName: 'test1.pdf' },
              { fileId: 'file-2', fileName: 'test2.pdf' },
            ],
          },
        });
        onEvent({
          type: 'done',
          data: {
            processingTime: 150,
            // No explicit sources count in done event
          },
        });
      });

      await handleStreamingV2(companyId, validRequest, mockRes as unknown as Response, Date.now());

      expect(mockPublishAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            sourcesCount: 2, // Should use count from sources event
          }),
        })
      );
    });

    it('should default to 0 for sources count when no sources event received', async () => {
      const { handleStreamingV2 } = require('../../../src/controllers/chat-v2.controller');

      mockSmartAgentV2Service.chatStream.mockImplementation(async (companyId, request, onEvent) => {
        // No sources event, only done event
        onEvent({
          type: 'done',
          data: { processingTime: 100 },
        });
      });

      await handleStreamingV2(companyId, validRequest, mockRes as unknown as Response, Date.now());

      expect(mockPublishAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            sourcesCount: 0,
          }),
        })
      );
    });
  });

  describe('asyncHandler integration', () => {
    it('should wrap functions with asyncHandler', () => {
      expect(mockAsyncHandler).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle errors through asyncHandler for chatV2', async () => {
      const error = new Error('Test error');
      mockSmartAgentV2Service.chat.mockRejectedValue(error);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: {
          query: 'Test query',
          projectId: 'project-456',
        },
      });

      await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      // The asyncHandler should catch the error and pass it to next
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle errors through asyncHandler for chatV2Stream', async () => {
      const error = new Error('Streaming test error');
      mockCompanyIdSchema.parse.mockImplementation(() => {
        throw error;
      });

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'Test query',
          projectId: 'project-456',
        },
      });

      await chatV2Stream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      // The asyncHandler should catch the error and pass it to next
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logging', () => {
    it('should log chatV2 requests with correct details', async () => {
      const { logger } = require('../../../src/utils/logger');

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: {
          query: 'What is machine learning?',
          projectId: 'project-456',
          searchMode: 'deep' as const,
          responseFormat: 'structured' as const,
          includeReasoning: true,
          messages: [{ role: 'user', content: 'Previous message' }],
        },
      });

      await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('ChatV2 request received', {
        companyId,
        projectId: 'project-456',
        queryLength: 'What is machine learning?'.length,
        searchMode: 'deep',
        responseFormat: 'structured',
        includeReasoning: true,
        hasHistory: true,
      });
    });

    it('should log chatV2Stream requests with correct details', async () => {
      const { logger } = require('../../../src/utils/logger');

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: {
          query: 'Stream this query',
          projectId: 'project-456',
          searchMode: 'fast' as const,
        },
      });

      await chatV2Stream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('ChatV2 streaming request received', {
        companyId,
        projectId: 'project-456',
        queryLength: 'Stream this query'.length,
        searchMode: 'fast',
      });
    });

    it('should log streaming errors', async () => {
      const { logger } = require('../../../src/utils/logger');
      const { handleStreamingV2 } = require('../../../src/controllers/chat-v2.controller');

      const streamingError = new Error('Network error');
      mockSmartAgentV2Service.chatStream.mockRejectedValue(streamingError);

      const validRequest = {
        query: 'What is the refund policy?',
        projectId: 'project-456',
        includeMetadata: true,
      };

      await handleStreamingV2(companyId, validRequest, mockRes as unknown as Response, Date.now());

      expect(logger.error).toHaveBeenCalledWith('ChatV2 streaming error', {
        companyId,
        error: streamingError,
      });
    });
  });

  describe('analytics publishing', () => {
    it('should publish analytics asynchronously without awaiting', async () => {
      mockPublishAnalytics.mockImplementation(() => {
        throw new Error('Analytics error'); // Should not affect main response
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { companyId },
        body: {
          query: 'Test query',
          projectId: 'project-456',
        },
      });

      await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      // Should still return successful response despite analytics error
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle analytics publishing for various response formats', async () => {
      const responses = [
        {
          answer: 'Text answer',
          sources: [],
          responseFormat: 'text' as const,
          model: 'gpt-4o-mini',
          provider: 'openai' as const,
          searchMode: 'fast' as const,
          processingTime: 100,
        },
        {
          answer: 'Markdown answer',
          sources: [
            {
              fileId: 'f1',
              fileName: 'test.md',
              chunkIndex: 0,
              content: 'content',
              score: 0.8,
              citationNumber: 1,
            },
          ],
          responseFormat: 'markdown' as const,
          model: 'gpt-4o-mini',
          provider: 'openai' as const,
          searchMode: 'deep' as const,
          processingTime: 500,
          confidence: 0.9,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        },
      ];

      for (const response of responses) {
        mockSmartAgentV2Service.chat.mockResolvedValue(response);

        const mockReq = createMockAuthenticatedRequest(mockCompany, {
          params: { companyId },
          body: {
            query: 'Test query',
            projectId: 'project-456',
            responseFormat: response.responseFormat,
          },
        });

        await chatV2(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

        expect(mockPublishAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              responseFormat: response.responseFormat,
              sourcesCount: response.sources.length,
              answerLength: response.answer.length,
              confidence: response.confidence,
              usage: response.usage,
            }),
          })
        );
      }
    });
  });
});
