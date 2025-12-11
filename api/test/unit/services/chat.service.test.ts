import { Response } from 'express';
import { VectorService } from '../../../src/services/vector.service';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { projectRepository } from '../../../src/repositories/project.repository';
import { ExternalServiceError } from '../../../src/types/error.types';

// Mock dependencies
jest.mock('../../../src/services/vector.service');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/repositories/project.repository');
jest.mock('../../../src/config', () => ({
  CONFIG: {
    OPENAI_API_KEY: 'test-openai-key',
    GEMINI_API_KEY: 'test-gemini-key',
    LLM_PROVIDER: 'openai',
    OPENAI_CHAT_MODEL: 'gpt-4',
    GEMINI_CHAT_MODEL: 'gemini-pro',
    CHAT_MAX_TOKENS: 4096,
    CHAT_TEMPERATURE: 0.7,
  },
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock OpenAI chat completions
const mockOpenAICreate = jest.fn();
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    })),
  };
});

// Mock Gemini
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn(),
        sendMessageStream: jest.fn(),
      }),
    }),
  })),
  Content: {},
  TaskType: {
    RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT',
    RETRIEVAL_QUERY: 'RETRIEVAL_QUERY',
    SEMANTIC_SIMILARITY: 'SEMANTIC_SIMILARITY',
    CLASSIFICATION: 'CLASSIFICATION',
    CLUSTERING: 'CLUSTERING',
  },
}));

// Import ChatService AFTER setting up mocks
import { ChatService } from '../../../src/services/chat.service';

describe('ChatService', () => {
  const mockCompanyId = 'company-123';
  const mockProjectId = 'project-123';
  const mockFileId = 'file-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    const mockRequest = {
      query: 'What is the capital of France?',
      limit: 5,
      includeSources: true,
      rerank: false,
      stream: false,
    };

    const mockSearchResults = [
      {
        id: 'point-1',
        score: 0.95,
        payload: {
          fileId: mockFileId,
          content: 'Paris is the capital of France.',
          chunkIndex: 0,
        },
      },
    ];

    const mockFile = {
      _id: mockFileId,
      originalFilename: 'geography.txt',
      filename: 'geography.txt',
      projectId: mockProjectId,
    };

    const mockProject = {
      _id: mockProjectId,
      name: 'Geography Project',
    };

    beforeEach(() => {
      // Setup common mocks
      (VectorService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2, 0.3]]);
      (VectorService.search as jest.Mock).mockResolvedValue(mockSearchResults);
      (fileMetadataRepository.findByIds as jest.Mock).mockResolvedValue([mockFile]);
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);

      // Default OpenAI response
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'The capital of France is Paris.' } }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 20,
          total_tokens: 120,
        },
      });
    });

    it('should perform chat with context from vector search', async () => {
      const result = await ChatService.chat(mockCompanyId, mockRequest);

      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('usage');
      expect(result.provider).toBe('openai');
      expect(VectorService.getEmbeddings).toHaveBeenCalled();
      expect(VectorService.search).toHaveBeenCalled();
    });

    it('should filter by projectId when specified', async () => {
      const requestWithProject = {
        ...mockRequest,
        filter: { projectId: mockProjectId },
      };

      const mockProjectFiles = [{ _id: mockFileId }];
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: mockCompanyId,
      });
      (fileMetadataRepository.findByProjectId as jest.Mock).mockResolvedValue(mockProjectFiles);
      (VectorService.search as jest.Mock).mockResolvedValue(mockSearchResults);

      await ChatService.chat(mockCompanyId, requestWithProject);

      expect(projectRepository.findById).toHaveBeenCalledWith(mockProjectId);
      expect(fileMetadataRepository.findByProjectId).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return empty sources if project not found', async () => {
      const requestWithProject = {
        ...mockRequest,
        filter: { projectId: 'non-existent-project' },
      };

      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await ChatService.chat(mockCompanyId, requestWithProject);

      expect(result.sources).toEqual([]);
    });

    it('should return empty sources if project belongs to different company', async () => {
      const requestWithProject = {
        ...mockRequest,
        filter: { projectId: mockProjectId },
      };

      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });

      const result = await ChatService.chat(mockCompanyId, requestWithProject);

      expect(result.sources).toEqual([]);
    });

    it('should handle fileId filter', async () => {
      const requestWithFile = {
        ...mockRequest,
        filter: { fileId: mockFileId },
      };

      await ChatService.chat(mockCompanyId, requestWithFile);

      expect(VectorService.search).toHaveBeenCalledWith(
        `company_${mockCompanyId}`,
        expect.any(Array),
        mockRequest.limit,
        expect.objectContaining({
          must: [
            {
              key: 'fileId',
              match: { value: mockFileId },
            },
          ],
        })
      );
    });

    it('should handle fileIds filter with multiple files', async () => {
      const fileIds = ['file-1', 'file-2', 'file-3'];
      const requestWithFiles = {
        ...mockRequest,
        filter: { fileIds },
      };

      (VectorService.search as jest.Mock).mockResolvedValue([]);

      await ChatService.chat(mockCompanyId, requestWithFiles);

      expect(VectorService.search).toHaveBeenCalledWith(
        `company_${mockCompanyId}`,
        expect.any(Array),
        mockRequest.limit,
        expect.objectContaining({
          must: [
            {
              key: 'fileId',
              match: { any: fileIds },
            },
          ],
        })
      );
    });

    it('should use reranking when specified', async () => {
      const requestWithRerank = {
        ...mockRequest,
        rerank: true,
      };

      (VectorService.searchWithReranking as jest.Mock).mockResolvedValue(mockSearchResults);

      await ChatService.chat(mockCompanyId, requestWithRerank);

      expect(VectorService.searchWithReranking).toHaveBeenCalled();
      expect(VectorService.search).not.toHaveBeenCalled();
    });

    it('should not include sources when includeSources is false', async () => {
      const requestWithoutSources = {
        ...mockRequest,
        includeSources: false,
      };

      const result = await ChatService.chat(mockCompanyId, requestWithoutSources);

      expect(result.sources).toEqual([]);
    });

    it('should use custom system prompt when provided', async () => {
      const customPrompt = 'You are a geography expert.';
      const requestWithPrompt = {
        ...mockRequest,
        systemPrompt: customPrompt,
      };

      await ChatService.chat(mockCompanyId, requestWithPrompt);

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining(customPrompt),
            }),
          ]),
        })
      );
    });

    it('should handle conversation history', async () => {
      const requestWithHistory = {
        ...mockRequest,
        messages: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' },
        ],
      };

      await ChatService.chat(mockCompanyId, requestWithHistory);

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Hello' }),
            expect.objectContaining({ role: 'assistant', content: 'Hi there!' }),
          ]),
        })
      );
    });

    it('should handle custom temperature and maxTokens', async () => {
      const requestWithParams = {
        ...mockRequest,
        temperature: 0.5,
        maxTokens: 2048,
      };

      await ChatService.chat(mockCompanyId, requestWithParams);

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          max_tokens: 2048,
        })
      );
    });

    it('should handle empty search results gracefully', async () => {
      (VectorService.search as jest.Mock).mockResolvedValue([]);

      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'I could not find relevant information.' } }],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      });

      const result = await ChatService.chat(mockCompanyId, mockRequest);

      expect(result.answer).toContain('could not find');
    });

    it('should throw ExternalServiceError on API key error', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('Invalid API key provided'));

      await expect(ChatService.chat(mockCompanyId, mockRequest)).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('should throw ExternalServiceError on rate limit', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('rate limit exceeded'));

      await expect(ChatService.chat(mockCompanyId, mockRequest)).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('should handle missing file metadata gracefully', async () => {
      (fileMetadataRepository.findByIds as jest.Mock).mockResolvedValue([]);

      const result = await ChatService.chat(mockCompanyId, mockRequest);

      // Should still work, just with empty/minimal sources
      expect(result).toHaveProperty('answer');
    });
  });

  describe('chatStream', () => {
    const mockRequest = {
      query: 'Test streaming query',
      limit: 5,
      includeSources: true,
      rerank: false,
      stream: true,
    };

    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      (VectorService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2, 0.3]]);
      (VectorService.search as jest.Mock).mockResolvedValue([]);
    });

    it('should setup SSE headers correctly', async () => {
      // Create an async generator for streaming
      async function* mockStream(): AsyncGenerator<{
        choices: { delta: { content?: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      }> {
        yield { choices: [{ delta: { content: 'Hello' } }] };
        yield { choices: [{ delta: { content: ' World' } }] };
        yield {
          choices: [{ delta: {} }],
          usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
        };
      }

      mockOpenAICreate.mockResolvedValue(mockStream());

      await ChatService.chatStream(mockCompanyId, mockRequest, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockResponse.flushHeaders).toHaveBeenCalled();
    });

    it('should write token events to response', async () => {
      async function* mockStream(): AsyncGenerator<{
        choices: { delta: { content?: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      }> {
        yield { choices: [{ delta: { content: 'Test' } }] };
        yield { choices: [{ delta: {} }] };
      }

      mockOpenAICreate.mockResolvedValue(mockStream());

      await ChatService.chatStream(mockCompanyId, mockRequest, mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: token'));
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"token":"Test"'));
    });

    it('should send done event at the end', async () => {
      async function* mockStream(): AsyncGenerator<{
        choices: { delta: { content?: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      }> {
        yield { choices: [{ delta: {} }] };
      }

      mockOpenAICreate.mockResolvedValue(mockStream());

      await ChatService.chatStream(mockCompanyId, mockRequest, mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: done'));
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should send error event on failure', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('Stream failed'));

      await ChatService.chatStream(mockCompanyId, mockRequest, mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: error'));
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should send sources event when includeSources is true', async () => {
      const mockSources = [
        {
          id: 'point-1',
          score: 0.9,
          payload: {
            fileId: 'file-1',
            content: 'Test content',
            chunkIndex: 0,
          },
        },
      ];

      (VectorService.search as jest.Mock).mockResolvedValue(mockSources);
      (fileMetadataRepository.findByIds as jest.Mock).mockResolvedValue([
        { _id: 'file-1', originalFilename: 'test.txt', projectId: null },
      ]);

      async function* mockStream(): AsyncGenerator<{ choices: { delta: { content?: string } }[] }> {
        yield { choices: [{ delta: {} }] };
      }

      mockOpenAICreate.mockResolvedValue(mockStream());

      await ChatService.chatStream(mockCompanyId, mockRequest, mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: sources'));
    });
  });

  describe('chunk arrangement', () => {
    it('should group chunks by file and sort by chunk index', async () => {
      const searchResults = [
        { id: '1', score: 0.9, payload: { fileId: 'file-1', content: 'Chunk 2', chunkIndex: 2 } },
        { id: '2', score: 0.8, payload: { fileId: 'file-1', content: 'Chunk 0', chunkIndex: 0 } },
        { id: '3', score: 0.95, payload: { fileId: 'file-2', content: 'Chunk 1', chunkIndex: 1 } },
        { id: '4', score: 0.85, payload: { fileId: 'file-2', content: 'Chunk 0', chunkIndex: 0 } },
      ];

      (VectorService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1]]);
      (VectorService.search as jest.Mock).mockResolvedValue(searchResults);
      (fileMetadataRepository.findByIds as jest.Mock).mockResolvedValue([
        { _id: 'file-1', originalFilename: 'file1.txt', projectId: null },
        { _id: 'file-2', originalFilename: 'file2.txt', projectId: null },
      ]);

      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'Answer' } }],
        usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
      });

      const result = await ChatService.chat(mockCompanyId, {
        query: 'test',
        limit: 10,
        includeSources: true,
        rerank: false,
        stream: false,
      });

      // File-2 should come first (has highest scoring chunk at 0.95)
      // Within each file, chunks should be sorted by index
      expect(result.sources[0].fileId).toBe('file-2');
      expect(result.sources[0].chunkIndex).toBe(0);
      expect(result.sources[1].fileId).toBe('file-2');
      expect(result.sources[1].chunkIndex).toBe(1);
      expect(result.sources[2].fileId).toBe('file-1');
      expect(result.sources[2].chunkIndex).toBe(0);
      expect(result.sources[3].fileId).toBe('file-1');
      expect(result.sources[3].chunkIndex).toBe(2);
    });
  });
});
