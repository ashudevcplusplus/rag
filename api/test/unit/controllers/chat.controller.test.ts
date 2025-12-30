import { Request, Response } from 'express';
import { chat, chatStream } from '../../../src/controllers/chat.controller';
import { SmartAgentService } from '../../../src/services/smart-agent.service';
import {
  createMockResponse,
  createMockRequest,
  createMockChatResponse,
  MockExpressResponse,
} from '../../lib/mock-utils';

// Mock dependencies
jest.mock('../../../src/services/smart-agent.service');
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
      (SmartAgentService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          limit: 5,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chat).toHaveBeenCalledWith(companyId, expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith(mockChatResponse);
    });

    it('should use streaming when stream is true', async () => {
      (SmartAgentService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          stream: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.any(Object),
        expect.any(Object)
      );
      expect(SmartAgentService.chat).not.toHaveBeenCalled();
    });

    it('should handle rerank option', async () => {
      const mockChatResponse = createMockChatResponse();
      (SmartAgentService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          rerank: true,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ rerank: true })
      );
    });

    it('should handle conversation history', async () => {
      const mockChatResponse = createMockChatResponse();
      (SmartAgentService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'Follow up question',
          projectId: 'test-project-id',
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chat).toHaveBeenCalledWith(
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
      (SmartAgentService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          llmProvider: 'gemini',
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ llmProvider: 'gemini' })
      );
    });

    it('should handle custom embedding provider', async () => {
      const mockChatResponse = createMockChatResponse();
      (SmartAgentService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          embeddingProvider: 'gemini',
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ embeddingProvider: 'gemini' })
      );
    });

    it('should handle custom limit', async () => {
      const mockChatResponse = createMockChatResponse();
      (SmartAgentService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          limit: 10,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ limit: 10 })
      );
    });

    it('should handle includeSources option', async () => {
      const mockChatResponse = createMockChatResponse({ sources: [] });
      (SmartAgentService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          includeSources: false,
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ includeSources: false })
      );
    });

    it('should handle filter by projectId', async () => {
      const mockChatResponse = createMockChatResponse();
      (SmartAgentService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'project-123',
        },
      });

      await chat(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chat).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({
          projectId: 'project-123',
        })
      );
    });
  });

  describe('chatStream', () => {
    it('should setup streaming response correctly', async () => {
      (SmartAgentService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ stream: true }),
        expect.any(Object)
      );
    });

    it('should force stream to true', async () => {
      (SmartAgentService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          stream: false, // Should be overridden
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ stream: true }),
        expect.any(Object)
      );
    });

    it('should handle rerank in streaming', async () => {
      (SmartAgentService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          rerank: true,
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ rerank: true }),
        expect.any(Object)
      );
    });

    it('should handle conversation history in streaming', async () => {
      (SmartAgentService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'Follow up question',
          projectId: 'test-project-id',
          messages: [{ role: 'user', content: 'Previous question' }],
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({
          messages: expect.any(Array),
        }),
        expect.any(Object)
      );
    });

    it('should handle different LLM providers in streaming', async () => {
      (SmartAgentService.chatStream as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { companyId },
        body: {
          query: 'What is the meaning of life?',
          projectId: 'test-project-id',
          llmProvider: 'gemini',
        },
      });

      await chatStream(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(SmartAgentService.chatStream).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({ llmProvider: 'gemini' }),
        expect.any(Object)
      );
    });
  });
});
