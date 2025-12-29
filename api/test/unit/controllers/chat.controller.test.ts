import { Request, Response } from 'express';
import { chat, chatStream } from '../../../src/controllers/chat.controller';
import { ChatService } from '../../../src/services/chat.service';
import {
  createMockResponse,
  createMockRequest,
  createMockChatResponse,
  MockExpressResponse,
} from '../../lib/mock-utils';

// Mock dependencies
jest.mock('../../../src/services/chat.service');
jest.mock('../../../src/utils/async-events.util', () => ({
  publishAnalytics: jest.fn(),
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ChatController', () => {
  let mockRes: MockExpressResponse;
  const mockNext = jest.fn();

  const companyId = 'company-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
  });

  describe('chat', () => {
    it('should process chat request successfully', async () => {
      const mockChatResponse = createMockChatResponse({
        answer: 'The answer is 42.',
        provider: 'openai',
        model: 'gpt-4',
      });
      (ChatService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          limit: 5,
          useLegacyChat: true, // Use legacy ChatService for this test
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chat).toHaveBeenCalledWith(companyId, expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith(mockChatResponse);
    });

    it('should use streaming when stream is true', async () => {
      (ChatService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          stream: true,
          useLegacyChat: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.any(Object),
        expect.any(Object)
      );
      expect(ChatService.chat).not.toHaveBeenCalled();
    });

    it('should handle rerank option', async () => {
      const mockChatResponse = createMockChatResponse();
      (ChatService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          rerank: true,
          useLegacyChat: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ rerank: true })
      );
    });

    it('should handle conversation history', async () => {
      const mockChatResponse = createMockChatResponse();
      (ChatService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'Follow up question',
          projectId: 'test-project-id',
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
          useLegacyChat: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Hello' }),
          ]),
        })
      );
    });

    it('should handle custom LLM provider', async () => {
      const mockChatResponse = createMockChatResponse({ provider: 'gemini' });
      (ChatService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          llmProvider: 'gemini',
          useLegacyChat: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ llmProvider: 'gemini' })
      );
    });

    it('should handle custom embedding provider', async () => {
      const mockChatResponse = createMockChatResponse();
      (ChatService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          embeddingProvider: 'gemini',
          useLegacyChat: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ embeddingProvider: 'gemini' })
      );
    });

    it('should handle custom limit', async () => {
      const mockChatResponse = createMockChatResponse();
      (ChatService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          limit: 10,
          useLegacyChat: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ limit: 10 })
      );
    });

    it('should handle includeSources option', async () => {
      const mockChatResponse = createMockChatResponse({ sources: [] });
      (ChatService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          includeSources: false,
          useLegacyChat: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ includeSources: false })
      );
    });

    it('should handle filter by projectId', async () => {
      const mockChatResponse = createMockChatResponse();
      (ChatService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'project-123',
          useLegacyChat: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({
          projectId: 'project-123',
        })
      );
    });
  });

  describe('chatStream', () => {
    it('should setup streaming response correctly', async () => {
      (ChatService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          useLegacyChat: true,
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ stream: true }),
        expect.any(Object)
      );
    });

    it('should force stream to true', async () => {
      (ChatService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          stream: false, // Should be overridden
          useLegacyChat: true,
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ stream: true }),
        expect.any(Object)
      );
    });

    it('should handle rerank in streaming', async () => {
      (ChatService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          rerank: true,
          useLegacyChat: true,
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ rerank: true }),
        expect.any(Object)
      );
    });

    it('should handle conversation history in streaming', async () => {
      (ChatService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'Follow up question',
          projectId: 'test-project-id',
          messages: [{ role: 'user', content: 'Previous question' }],
          useLegacyChat: true,
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({
          messages: expect.any(Array),
        }),
        expect.any(Object)
      );
    });

    it('should handle different LLM providers in streaming', async () => {
      (ChatService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          llmProvider: 'gemini',
          useLegacyChat: true,
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(ChatService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ llmProvider: 'gemini' }),
        expect.any(Object)
      );
    });
  });
});
