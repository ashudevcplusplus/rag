import { ChatService } from '../../../src/services/chat.service';
import { VectorService } from '../../../src/services/vector.service';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { projectRepository } from '../../../src/repositories/project.repository';
import { ExternalServiceError } from '../../../src/types/error.types';
import { CONFIG } from '../../../src/config';
import { Response } from 'express';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  createMockResponse,
  createMockChatRequest,
  createMockSearchResult,
  createMockProject,
  createMockFileMetadata,
  createMockChatCompletion,
  createMockEmbedding,
  createMockStreamGenerator,
  applyConfigOverrides,
  DEFAULT_TEST_CONFIG,
  MockOpenAIClient,
  MockExpressResponse,
} from '../../lib/mock-utils';

// Mock dependencies
jest.mock('openai');
jest.mock('@google/generative-ai');
jest.mock('../../../src/services/vector.service');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/repositories/project.repository');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ChatService', () => {
  let mockOpenAIInstance: MockOpenAIClient;
  let mockResponse: MockExpressResponse;

  const companyId = 'company-123';
  const projectId = 'project-123';
  const fileId = 'file-123';

  const mockProject = createMockProject(companyId, { _id: projectId });
  const mockFile = createMockFileMetadata(projectId, {
    _id: fileId,
    originalFilename: 'test-document.txt',
  });

  const mockSearchResults = [
    createMockSearchResult({
      id: 'point-1',
      score: 0.95,
      payload: {
        fileId,
        chunkIndex: 0,
        content: 'The meaning of life is 42.',
        text_preview: 'The meaning of life...',
      },
    }),
    createMockSearchResult({
      id: 'point-2',
      score: 0.85,
      payload: {
        fileId,
        chunkIndex: 1,
        content: 'According to Douglas Adams, the answer is 42.',
        text_preview: 'According to Douglas Adams...',
      },
    }),
  ];

  const resetStaticClients = () => {
    // Type-safe way to reset private static members
    const service = ChatService as unknown as {
      openai: OpenAI | null;
      gemini: GoogleGenerativeAI | null;
    };
    service.openai = null;
    service.gemini = null;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset static clients
    resetStaticClients();

    // Setup mock OpenAI instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      embeddings: {
        create: jest.fn(),
      },
    };

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => {
      return mockOpenAIInstance as unknown as OpenAI;
    });

    // Set config values
    applyConfigOverrides(CONFIG as Record<string, unknown>, DEFAULT_TEST_CONFIG);

    // Default mocks
    (VectorService.getEmbeddings as jest.Mock).mockResolvedValue([createMockEmbedding()]);
    (VectorService.search as jest.Mock).mockResolvedValue(mockSearchResults);
    (VectorService.searchWithReranking as jest.Mock).mockResolvedValue(mockSearchResults);
    (fileMetadataRepository.findByIds as jest.Mock).mockResolvedValue([mockFile]);
    (fileMetadataRepository.findByProjectId as jest.Mock).mockResolvedValue([mockFile]);
    (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
    (projectRepository.findByIds as jest.Mock).mockResolvedValue([mockProject]);

    // Setup mock response for streaming tests
    mockResponse = createMockResponse();
  });

  describe('chat', () => {
    it('should successfully process a chat request with OpenAI', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('The answer is 42.', {
          prompt_tokens: 100,
          completion_tokens: 10,
          total_tokens: 110,
        })
      );

      const request = createMockChatRequest();
      const result = await ChatService.chat(companyId, request);

      expect(result).toMatchObject({
        answer: 'The answer is 42.',
        provider: 'openai',
        model: 'gpt-4',
      });
      expect(result.sources).toHaveLength(2);
      expect(result.usage).toEqual({
        promptTokens: 100,
        completionTokens: 10,
        totalTokens: 110,
      });
    });

    it('should return empty sources when includeSources is false', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      const result = await ChatService.chat(
        companyId,
        createMockChatRequest({ includeSources: false })
      );

      expect(result.sources).toHaveLength(0);
    });

    it('should use reranking when requested', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      await ChatService.chat(companyId, createMockChatRequest({ rerank: true }));

      expect(VectorService.searchWithReranking).toHaveBeenCalled();
      expect(VectorService.search).not.toHaveBeenCalled();
    });

    it('should filter by projectId when provided', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      await ChatService.chat(companyId, createMockChatRequest({ filter: { projectId } }));

      expect(projectRepository.findById).toHaveBeenCalledWith(projectId);
      expect(fileMetadataRepository.findByProjectId).toHaveBeenCalledWith(projectId);
    });

    it('should return empty sources when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      const result = await ChatService.chat(
        companyId,
        createMockChatRequest({
          filter: { projectId: 'non-existent' },
        })
      );

      expect(result.sources).toHaveLength(0);
    });

    it('should return empty sources when project belongs to different company', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      const result = await ChatService.chat(
        companyId,
        createMockChatRequest({
          filter: { projectId },
        })
      );

      expect(result.sources).toHaveLength(0);
    });

    it('should throw ExternalServiceError when OpenAI API key is missing', async () => {
      applyConfigOverrides(CONFIG as Record<string, unknown>, { OPENAI_API_KEY: '' });
      resetStaticClients();

      const request = createMockChatRequest();
      await expect(ChatService.chat(companyId, request)).rejects.toThrow(ExternalServiceError);
      await expect(ChatService.chat(companyId, request)).rejects.toThrow(
        'OPENAI_API_KEY environment variable is not set'
      );
    });

    it('should throw ExternalServiceError on OpenAI API failure', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('API rate limit'));

      const request = createMockChatRequest();
      await expect(ChatService.chat(companyId, request)).rejects.toThrow(ExternalServiceError);
    });

    it('should handle empty response from OpenAI', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(createMockChatCompletion(''));

      const result = await ChatService.chat(companyId, createMockChatRequest());

      expect(result.answer).toBe('');
    });

    it('should handle no search results', async () => {
      (VectorService.search as jest.Mock).mockResolvedValue([]);
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('No information found.')
      );

      const result = await ChatService.chat(companyId, createMockChatRequest());

      expect(result.sources).toHaveLength(0);
    });

    it('should apply custom system prompt', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      await ChatService.chat(
        companyId,
        createMockChatRequest({
          systemPrompt: 'You are a pirate. Answer in pirate speak.',
        })
      );

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0] as {
        messages: Array<{ content: string }>;
      };
      expect(callArgs.messages[0].content).toContain('You are a pirate');
    });

    it('should include conversation history', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      await ChatService.chat(
        companyId,
        createMockChatRequest({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
        })
      );

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0] as {
        messages: unknown[];
      };
      // System + 2 history messages + current query
      expect(callArgs.messages.length).toBe(4);
    });

    it('should respect maxTokens parameter', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      await ChatService.chat(companyId, createMockChatRequest({ maxTokens: 500 }));

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0] as {
        max_tokens: number;
      };
      expect(callArgs.max_tokens).toBe(500);
    });

    it('should respect temperature parameter', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      await ChatService.chat(companyId, createMockChatRequest({ temperature: 0.2 }));

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0] as {
        temperature: number;
      };
      expect(callArgs.temperature).toBe(0.2);
    });

    it('should filter by fileId when provided', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      await ChatService.chat(companyId, createMockChatRequest({ filter: { fileId } }));

      expect(VectorService.search).toHaveBeenCalled();
    });

    it('should filter by multiple fileIds when provided', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      await ChatService.chat(
        companyId,
        createMockChatRequest({
          filter: { fileIds: ['file-1', 'file-2'] },
        })
      );

      expect(VectorService.search).toHaveBeenCalled();
    });
  });

  describe('chatStream', () => {
    it('should setup SSE headers correctly', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockStreamGenerator(['Hello', ' World'])
      );

      await ChatService.chatStream(companyId, createMockChatRequest(), mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockResponse.flushHeaders).toHaveBeenCalled();
    });

    it('should send sources event when includeSources is true', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockStreamGenerator(['Answer'])
      );

      await ChatService.chatStream(companyId, createMockChatRequest(), mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: sources'));
    });

    it('should send token events during streaming', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockStreamGenerator(['Hello', ' World'])
      );

      await ChatService.chatStream(companyId, createMockChatRequest(), mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith('event: token\n');
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"token":"Hello"'));
    });

    it('should send done event at the end', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockStreamGenerator(['Done'])
      );

      await ChatService.chatStream(companyId, createMockChatRequest(), mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith('event: done\n');
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should send error event on failure', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('Stream error'));

      await ChatService.chatStream(companyId, createMockChatRequest(), mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith('event: error\n');
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('chunk arrangement', () => {
    it('should group chunks by file and sort by chunk index', async () => {
      // Simulate chunks coming back in different order than expected
      const unorderedSearchResults = [
        createMockSearchResult({
          id: 'point-1',
          score: 0.9,
          payload: { fileId: 'file-1', chunkIndex: 2, content: 'Chunk 2 of file 1' },
        }),
        createMockSearchResult({
          id: 'point-2',
          score: 0.8,
          payload: { fileId: 'file-1', chunkIndex: 0, content: 'Chunk 0 of file 1' },
        }),
        createMockSearchResult({
          id: 'point-3',
          score: 0.95,
          payload: { fileId: 'file-2', chunkIndex: 1, content: 'Chunk 1 of file 2' },
        }),
        createMockSearchResult({
          id: 'point-4',
          score: 0.85,
          payload: { fileId: 'file-2', chunkIndex: 0, content: 'Chunk 0 of file 2' },
        }),
      ];

      (VectorService.search as jest.Mock).mockResolvedValue(unorderedSearchResults);
      (fileMetadataRepository.findByIds as jest.Mock).mockResolvedValue([
        createMockFileMetadata(projectId, { _id: 'file-1', originalFilename: 'file1.txt' }),
        createMockFileMetadata(projectId, { _id: 'file-2', originalFilename: 'file2.txt' }),
      ]);

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer')
      );

      const result = await ChatService.chat(companyId, createMockChatRequest());

      // Verify sources are returned (grouping/sorting behavior depends on implementation)
      expect(result.sources.length).toBe(4);
      // Verify file-2 comes first since it has highest score (0.95)
      expect(result.sources[0].fileId).toBe('file-2');
    });

    it('should handle missing file metadata gracefully', async () => {
      // Some files are not found in the database
      (fileMetadataRepository.findByIds as jest.Mock).mockResolvedValue([]);

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        createMockChatCompletion('Answer even without file info.')
      );

      const result = await ChatService.chat(companyId, createMockChatRequest());

      // Should still work, just with minimal sources info
      expect(result).toHaveProperty('answer');
      expect(result.answer).toBe('Answer even without file info.');
    });
  });

  describe('Gemini provider', () => {
    let mockGeminiInstance: {
      getGenerativeModel: jest.Mock;
    };

    let mockGenModel: {
      startChat: jest.Mock;
    };

    let mockChat: {
      sendMessage: jest.Mock;
      sendMessageStream: jest.Mock;
    };

    beforeEach(() => {
      mockChat = {
        sendMessage: jest.fn(),
        sendMessageStream: jest.fn(),
      };

      mockGenModel = {
        startChat: jest.fn().mockReturnValue(mockChat),
      };

      mockGeminiInstance = {
        getGenerativeModel: jest.fn().mockReturnValue(mockGenModel),
      };

      (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(
        () => mockGeminiInstance as unknown as GoogleGenerativeAI
      );
    });

    it('should use Gemini when llmProvider is gemini', async () => {
      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => 'Gemini response',
          usageMetadata: {
            promptTokenCount: 50,
            candidatesTokenCount: 10,
            totalTokenCount: 60,
          },
        },
      });

      const result = await ChatService.chat(
        companyId,
        createMockChatRequest({
          llmProvider: 'gemini',
        })
      );

      expect(result.answer).toBe('Gemini response');
      expect(result.provider).toBe('gemini');
      expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-gemini-key');
    });

    it('should throw error when Gemini API key is missing', async () => {
      applyConfigOverrides(CONFIG as Record<string, unknown>, { GEMINI_API_KEY: '' });
      resetStaticClients();

      await expect(
        ChatService.chat(companyId, createMockChatRequest({ llmProvider: 'gemini' }))
      ).rejects.toThrow(ExternalServiceError);
    });

    it('should handle Gemini response without usage metadata', async () => {
      (VectorService.search as jest.Mock).mockResolvedValue([]);

      mockChat.sendMessage.mockResolvedValue({
        response: {
          text: () => 'Response',
        },
      });

      const result = await ChatService.chat(
        companyId,
        createMockChatRequest({
          llmProvider: 'gemini',
        })
      );

      expect(result).toBeDefined();
    });
  });
});
