import OpenAI from 'openai';
import { SmartAgentV2Service } from '../../../src/services/smart-agent-v2.service';
import { VectorService } from '../../../src/services/vector.service';
import { ConversationContextService } from '../../../src/services/conversation-context.service';
import { conversationRepository } from '../../../src/repositories/conversation.repository';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { embeddingRepository } from '../../../src/repositories/embedding.repository';
import { CacheService } from '../../../src/services/cache.service';
import { withTimeout, TimeoutError } from '../../../src/utils/request.util';
import {
  ChatV2Request,
  ChatV2Response,
  ChatV2Source,
  QueryAnalysis,
  SearchMode,
} from '../../../src/schemas/chat-v2.schema';
import { SearchResult, QdrantFilter } from '../../../src/types/vector.types';
import { createMockHttpError, MockQdrantClient } from '../../lib/mock-utils';
import { projectRepository } from '../../../src/repositories/project.repository';

// Mock dependencies BEFORE importing SmartAgentV2Service
jest.mock('openai');
jest.mock('../../../src/services/vector.service');
jest.mock('../../../src/services/conversation-context.service');
jest.mock('../../../src/repositories/conversation.repository');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/repositories/embedding.repository');
jest.mock('../../../src/repositories/project.repository');
jest.mock('../../../src/services/cache.service');
jest.mock('../../../src/utils/request.util');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../../src/config', () => ({
  CONFIG: {
    OPENAI_API_KEY: 'test-api-key',
    OPENAI_CHAT_MODEL: 'gpt-4o-mini',
    OPENAI_QUERY_ANALYSIS_MODEL: 'gpt-4o-mini',
    OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
    OPENAI_RERANK_MODEL: 'gpt-4o-mini',
    OPENAI_FOLLOWUP_MODEL: 'gpt-4o-mini',
    CHAT_MAX_TOKENS: 2048,
    CHAT_TEMPERATURE: 0.7,
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock OpenAI client
const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
  () => mockOpenAIClient as unknown as OpenAI
);

// Mock other services
const mockVectorService = {
  getEmbeddings: jest.fn(),
  search: jest.fn(),
  rerank: jest.fn(),
};

const mockConversationContextService = {
  shouldUseCache: jest.fn(),
  createCachedContext: jest.fn(),
};

const mockConversationRepository = {
  findByIdWithCache: jest.fn(),
  updateCachedContext: jest.fn(),
};

const mockFileMetadataRepository = {
  findByIds: jest.fn(),
  findByProjectId: jest.fn(),
  findByTags: jest.fn(),
  findById: jest.fn(),
};

const mockEmbeddingRepository = {
  findChunks: jest.fn(),
  findByFileId: jest.fn(),
};

const mockProjectRepository = {
  findById: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};

// Apply mocks
(VectorService as jest.MockedClass<typeof VectorService>).mockImplementation(
  () => mockVectorService as unknown as VectorService
);

(
  ConversationContextService as jest.MockedClass<typeof ConversationContextService>
).mockImplementation(() => mockConversationContextService as unknown as ConversationContextService);

(conversationRepository as jest.Mocked<typeof conversationRepository>).findByIdWithCache =
  mockConversationRepository.findByIdWithCache;
(conversationRepository as jest.Mocked<typeof conversationRepository>).updateCachedContext =
  mockConversationRepository.updateCachedContext;

(fileMetadataRepository as jest.Mocked<typeof fileMetadataRepository>).findByIds =
  mockFileMetadataRepository.findByIds;
(fileMetadataRepository as jest.Mocked<typeof fileMetadataRepository>).findByProjectId =
  mockFileMetadataRepository.findByProjectId;
(fileMetadataRepository as jest.Mocked<typeof fileMetadataRepository>).findByTags =
  mockFileMetadataRepository.findByTags;
(fileMetadataRepository as jest.Mocked<typeof fileMetadataRepository>).findById =
  mockFileMetadataRepository.findById;

(embeddingRepository as jest.Mocked<typeof embeddingRepository>).findChunks =
  mockEmbeddingRepository.findChunks;
(embeddingRepository as jest.Mocked<typeof embeddingRepository>).findByFileId =
  mockEmbeddingRepository.findByFileId;

(projectRepository as jest.Mocked<typeof projectRepository>).findById =
  mockProjectRepository.findById;

(CacheService as jest.MockedClass<typeof CacheService>).mockImplementation(
  () => mockCacheService as unknown as CacheService
);

const mockWithTimeout = jest.mocked(withTimeout);
mockWithTimeout.mockImplementation(async (fn: any) => await fn());

describe('SmartAgentV2Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations to defaults
    mockOpenAIClient.chat.completions.create.mockReset();
    mockVectorService.getEmbeddings.mockReset();
    mockVectorService.search.mockReset();
    mockVectorService.rerank.mockReset();
    mockConversationContextService.shouldUseCache.mockReset();
    mockConversationContextService.createCachedContext.mockReset();
    mockConversationRepository.findByIdWithCache.mockReset();
    mockConversationRepository.updateCachedContext.mockReset();
    mockFileMetadataRepository.findByIds.mockReset();
    mockFileMetadataRepository.findByProjectId.mockReset();
    mockFileMetadataRepository.findByTags.mockReset();
    mockFileMetadataRepository.findById.mockReset();
    mockEmbeddingRepository.findChunks.mockReset();
    mockEmbeddingRepository.findByFileId.mockReset();
    mockProjectRepository.findById.mockReset();
    mockCacheService.get.mockReset();
    mockCacheService.set.mockReset();
    mockWithTimeout.mockReset();
    mockWithTimeout.mockImplementation(async (fn: any) => await fn());
  });

  describe('chat', () => {
    const companyId = 'company-123';
    const mockRequest = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
    } as any;

    it('should process a chat request successfully', async () => {
      // Mock query analysis
      const mockAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['refund policy', 'return policy', 'money back guarantee'],
        keywords: ['refund', 'policy', 'return'],
        confidence: 0.9,
        needsClarification: false,
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      // Mock conversation lookup
      mockConversationRepository.findByIdWithCache.mockResolvedValue(null);

      // Mock context retrieval
      const mockSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Our refund policy states...',
          score: 0.95,
          citationNumber: 1,
        },
      ];

      const mockRetrieveContext = jest.spyOn(
        SmartAgentV2Service as any,
        'retrieveContextWithCaching'
      );
      mockRetrieveContext.mockResolvedValue({
        sources: mockSources,
        usedCache: false,
      });

      // Mock answer generation
      const mockAnswer = 'Our refund policy allows returns within 30 days...';
      const mockGenerateAnswer = jest.spyOn(SmartAgentV2Service as any, 'generateAnswer');
      mockGenerateAnswer.mockResolvedValue({
        answer: mockAnswer,
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      });

      // Mock confidence calculation
      const mockCalculateConfidence = jest.spyOn(SmartAgentV2Service as any, 'calculateConfidence');
      mockCalculateConfidence.mockReturnValue(0.85);

      const result = await SmartAgentV2Service.chat(companyId, mockRequest);

      expect(result).toMatchObject({
        answer: mockAnswer,
        sources: mockSources,
        confidence: 0.85,
        responseFormat: 'markdown',
        model: 'gpt-4o-mini',
        provider: 'openai',
        searchMode: 'smart',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      });
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle greeting intent', async () => {
      const greetingRequest = {
        query: 'Hello there!',
        projectId: 'project-456',
      } as any;

      const mockAnalysis: QueryAnalysis = {
        intent: 'greeting',
        searchQueries: ['hello'],
        keywords: ['hello'],
        confidence: 0.95,
        needsClarification: false,
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      });

      const result = await SmartAgentV2Service.chat(companyId, greetingRequest);

      expect(result.answer).toContain("Hello! I'm here to help");
      expect(result.sources).toEqual([]);
      expect(result.confidence).toBeUndefined();
    });

    it('should handle clarification needed', async () => {
      const clarificationRequest: ChatV2Request = {
        ...mockRequest,
        query: 'Tell me about it',
      };

      const mockAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['it'],
        keywords: ['it'],
        confidence: 0.3,
        needsClarification: true,
        clarificationQuestion: "Could you be more specific about what you're asking about?",
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      });

      const result = await SmartAgentV2Service.chat(companyId, clarificationRequest);

      expect(result.answer).toContain('Could you be more specific');
      expect(result.sources).toEqual([]);
      expect(result.queryAnalysis).toEqual(mockAnalysis);
    });

    it('should handle no results found', async () => {
      const mockAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['nonexistent topic'],
        keywords: ['nonexistent', 'topic'],
        confidence: 0.8,
        needsClarification: false,
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      mockConversationRepository.findByIdWithCache.mockResolvedValue(null);

      const mockRetrieveContext = jest.spyOn(
        SmartAgentV2Service as any,
        'retrieveContextWithCaching'
      );
      mockRetrieveContext.mockResolvedValue({
        sources: [],
        usedCache: false,
      });

      const result = await SmartAgentV2Service.chat(companyId, mockRequest);

      expect(result.answer).toContain("I couldn't find any relevant information");
      expect(result.sources).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should generate follow-ups when confidence is high and metadata requested', async () => {
      const requestWithMetadata = {
        ...mockRequest,
        includeMetadata: true,
      };

      const mockAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['refund policy'],
        keywords: ['refund', 'policy'],
        confidence: 0.9,
        needsClarification: false,
      };

      mockOpenAIClient.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify(mockAnalysis),
              },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  followups: ['How long do returns take?', 'What items are eligible?'],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
        });

      mockConversationRepository.findByIdWithCache.mockResolvedValue(null);

      const mockSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Our refund policy states...',
          score: 0.95,
          citationNumber: 1,
        },
      ];

      const mockRetrieveContext = jest.spyOn(
        SmartAgentV2Service as any,
        'retrieveContextWithCaching'
      );
      mockRetrieveContext.mockResolvedValue({
        sources: mockSources,
        usedCache: false,
      });

      const mockGenerateAnswer = jest.spyOn(SmartAgentV2Service as any, 'generateAnswer');
      mockGenerateAnswer.mockResolvedValue({
        answer: 'Our refund policy allows returns within 30 days...',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      });

      const mockCalculateConfidence = jest.spyOn(SmartAgentV2Service as any, 'calculateConfidence');
      mockCalculateConfidence.mockReturnValue(0.8);

      const result = await SmartAgentV2Service.chat(companyId, requestWithMetadata);

      expect(result.suggestedFollowUps).toEqual([
        'How long do returns take?',
        'What items are eligible?',
      ]);
      expect(result.queryAnalysis).toEqual(mockAnalysis);
    });

    it('should skip follow-ups for low confidence', async () => {
      const requestWithMetadata = {
        ...mockRequest,
        includeMetadata: true,
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'find_information',
                searchQueries: ['refund policy'],
                keywords: ['refund', 'policy'],
                confidence: 0.9,
                needsClarification: false,
              }),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      mockConversationRepository.findByIdWithCache.mockResolvedValue(null);

      const mockSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Our refund policy states...',
          score: 0.95,
          citationNumber: 1,
        },
      ];

      const mockRetrieveContext = jest.spyOn(
        SmartAgentV2Service as any,
        'retrieveContextWithCaching'
      );
      mockRetrieveContext.mockResolvedValue({
        sources: mockSources,
        usedCache: false,
      });

      const mockGenerateAnswer = jest.spyOn(SmartAgentV2Service as any, 'generateAnswer');
      mockGenerateAnswer.mockResolvedValue({
        answer: 'Our refund policy allows returns within 30 days...',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      });

      const mockCalculateConfidence = jest.spyOn(SmartAgentV2Service as any, 'calculateConfidence');
      mockCalculateConfidence.mockReturnValue(0.4); // Low confidence

      const result = await SmartAgentV2Service.chat(companyId, requestWithMetadata);

      expect(result.suggestedFollowUps).toBeUndefined();
    });
  });

  describe('analyzeQuery', () => {
    it('should analyze query successfully', async () => {
      const query = 'What is the refund policy?';
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
      ];

      const expectedAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['refund policy', 'return policy', 'money back guarantee'],
        keywords: ['refund', 'policy'],
        confidence: 0.9,
        needsClarification: false,
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(expectedAnalysis),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await (SmartAgentV2Service as any).analyzeQuery(query, messages, true);

      expect(result).toEqual(expectedAnalysis);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.3,
      });
    });

    it('should use cached analysis when available', async () => {
      const query = 'What is the refund policy?';
      const cachedAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['refund policy'],
        keywords: ['refund', 'policy'],
        confidence: 0.8,
        needsClarification: false,
      };

      mockCacheService.get.mockResolvedValue(cachedAnalysis);

      const result = await (SmartAgentV2Service as any).analyzeQuery(query, [], true);

      expect(result).toEqual(cachedAnalysis);
      expect(mockOpenAIClient.chat.completions.create).not.toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('query-analysis:'),
        'query-analysis'
      );
    });

    it('should fallback to default analysis when LLM fails', async () => {
      const query = 'What is the refund policy?';

      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('LLM error'));

      const result = await (SmartAgentV2Service as any).analyzeQuery(query, [], false);

      expect(result).toEqual({
        intent: 'find_information',
        searchQueries: [query],
        keywords: expect.arrayContaining(['refund', 'policy']),
        confidence: 0.5,
        needsClarification: false,
      });
    });

    it('should handle timeout errors gracefully', async () => {
      const query = 'What is the refund policy?';

      mockWithTimeout.mockRejectedValueOnce(new TimeoutError('Query analysis timed out'));

      const result = await (SmartAgentV2Service as any).analyzeQuery(query, [], false);

      expect(result.intent).toBe('find_information');
      expect(result.searchQueries).toEqual([query]);
      expect(result.confidence).toBe(0.5);
    });

    it('should cache successful analysis', async () => {
      const query = 'What is the refund policy?';
      const expectedAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['refund policy'],
        keywords: ['refund', 'policy'],
        confidence: 0.9,
        needsClarification: false,
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(expectedAnalysis),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      await (SmartAgentV2Service as any).analyzeQuery(query, [], true);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('query-analysis:'),
        expectedAnalysis,
        3600
      );
    });
  });

  describe('retrieveContextWithCaching', () => {
    const companyId = 'company-123';
    const request = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
    } as any;

    it('should use cached context when available', async () => {
      const mockConversation = {
        _id: 'conv-123',
        cachedContext: {
          sources: [
            {
              fileId: 'file-1',
              fileName: 'policies.pdf',
              chunkIndex: 0,
              content: 'Cached refund policy content',
              score: 0.9,
              citationNumber: 1,
            },
          ],
          query: 'What is the refund policy?',
        },
        lastQueryEmbedding: [0.1, 0.2, 0.3],
      };

      const prefetchedConversation = {
        conversation: mockConversation,
        conversationHistory: [],
      };

      mockConversationContextService.shouldUseCache.mockResolvedValue({
        useCache: true,
        reason: 'similar query',
        similarityScore: 0.95,
      });

      const result = await (SmartAgentV2Service as any).retrieveContextWithCaching(
        companyId,
        request,
        {
          intent: 'find_information',
          searchQueries: ['refund policy'],
          keywords: [],
          confidence: 0.8,
          needsClarification: false,
        },
        'smart',
        prefetchedConversation
      );

      expect(result.sources).toEqual(mockConversation.cachedContext.sources);
      expect(result.usedCache).toBe(true);
    });

    it('should perform fresh search when cache not available', async () => {
      const mockAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['refund policy'],
        keywords: ['refund', 'policy'],
        confidence: 0.8,
        needsClarification: false,
      };

      const mockSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Fresh refund policy content',
          score: 0.85,
          citationNumber: 1,
        },
      ];

      mockConversationContextService.shouldUseCache.mockResolvedValue({
        useCache: false,
        reason: 'different query',
        similarityScore: 0.3,
      });

      const mockPerformSearch = jest.spyOn(SmartAgentV2Service as any, 'performSearch');
      mockPerformSearch.mockResolvedValue(mockSources);

      mockVectorService.getEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]]);

      const result = await (SmartAgentV2Service as any).retrieveContextWithCaching(
        companyId,
        { ...request, conversationId: 'conv-123' },
        mockAnalysis,
        'smart',
        null
      );

      expect(result.sources).toEqual(mockSources);
      expect(result.usedCache).toBe(false);
      expect(mockPerformSearch).toHaveBeenCalledWith(
        companyId,
        { ...request, conversationId: 'conv-123' },
        mockAnalysis,
        'smart'
      );
    });

    it('should save context to cache after fresh search', async () => {
      const mockAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['refund policy'],
        keywords: ['refund', 'policy'],
        confidence: 0.8,
        needsClarification: false,
      };

      const mockSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Refund policy content',
          score: 0.85,
          citationNumber: 1,
        },
      ];

      const mockPerformSearch = jest.spyOn(SmartAgentV2Service as any, 'performSearch');
      mockPerformSearch.mockResolvedValue(mockSources);

      mockVectorService.getEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]]);
      mockConversationContextService.createCachedContext.mockReturnValue({
        sources: mockSources,
        query: request.query,
        contextString: '[policies.pdf] Refund policy content',
      });

      await (SmartAgentV2Service as any).retrieveContextWithCaching(
        companyId,
        { ...request, conversationId: 'conv-123' },
        mockAnalysis,
        'smart',
        null
      );

      expect(mockConversationRepository.updateCachedContext).toHaveBeenCalledWith(
        'conv-123',
        companyId,
        expect.objectContaining({
          sources: mockSources,
          query: request.query,
        }),
        [0.1, 0.2, 0.3]
      );
    });
  });

  describe('performSearch', () => {
    const companyId = 'company-123';
    const request = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
    } as any;
    const analysis: QueryAnalysis = {
      intent: 'find_information',
      searchQueries: ['refund policy'],
      keywords: ['refund', 'policy'],
      confidence: 0.8,
      needsClarification: false,
    };

    it('should call searchFast for fast mode', async () => {
      const mockSearchFast = jest.spyOn(SmartAgentV2Service as any, 'searchFast');
      mockSearchFast.mockResolvedValue([]);

      await (SmartAgentV2Service as any).performSearch(companyId, request, analysis, 'fast');

      expect(mockSearchFast).toHaveBeenCalledWith(companyId, request, analysis);
    });

    it('should call searchSmart for smart mode', async () => {
      const mockSearchSmart = jest.spyOn(SmartAgentV2Service as any, 'searchSmart');
      mockSearchSmart.mockResolvedValue([]);

      await (SmartAgentV2Service as any).performSearch(companyId, request, analysis, 'smart');

      expect(mockSearchSmart).toHaveBeenCalledWith(companyId, request, analysis);
    });

    it('should call searchDeep for deep mode', async () => {
      const mockSearchDeep = jest.spyOn(SmartAgentV2Service as any, 'searchDeep');
      mockSearchDeep.mockResolvedValue([]);

      await (SmartAgentV2Service as any).performSearch(companyId, request, analysis, 'deep');

      expect(mockSearchDeep).toHaveBeenCalledWith(companyId, request, analysis);
    });
  });

  describe('searchFast', () => {
    const companyId = 'company-123';
    const request = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
    } as any;
    const analysis: QueryAnalysis = {
      intent: 'find_information',
      searchQueries: ['refund policy'],
      keywords: ['refund', 'policy'],
      confidence: 0.8,
      needsClarification: false,
    };

    it('should perform fast search successfully', async () => {
      const mockFilter: QdrantFilter = {
        must: [
          { key: 'companyId', match: { value: companyId } },
          { key: 'fileId', match: { any: ['file-1', 'file-2'] } },
        ],
      };

      const mockBuildFilter = jest.spyOn(SmartAgentV2Service as any, 'buildFilter');
      mockBuildFilter.mockResolvedValue(mockFilter);

      mockVectorService.getEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]]);
      mockVectorService.search.mockResolvedValue([
        {
          id: 'chunk-1',
          score: 0.9,
          payload: {
            fileId: 'file-1',
            chunkIndex: 0,
            content: 'Refund policy content',
            text_preview: 'Refund policy preview',
          },
        },
      ]);

      const mockEnrichSources = jest.spyOn(SmartAgentV2Service as any, 'enrichSources');
      const mockSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Refund policy content',
          score: 90,
          citationNumber: 1,
        },
      ];
      mockEnrichSources.mockResolvedValue(mockSources);

      const result = await (SmartAgentV2Service as any).searchFast(companyId, request, analysis);

      expect(result).toEqual(mockSources);
      expect(mockVectorService.getEmbeddings).toHaveBeenCalledWith(
        [request.query],
        'query',
        undefined
      );
      expect(mockVectorService.search).toHaveBeenCalledWith(
        `company_${companyId}`,
        [0.1, 0.2, 0.3],
        5,
        mockFilter
      );
    });

    it('should return empty array when no files in project', async () => {
      const mockBuildFilter = jest.spyOn(SmartAgentV2Service as any, 'buildFilter');
      mockBuildFilter.mockResolvedValue(undefined);

      const result = await (SmartAgentV2Service as any).searchFast(companyId, request, analysis);

      expect(result).toEqual([]);
      expect(mockVectorService.getEmbeddings).not.toHaveBeenCalled();
    });
  });

  describe('searchSmart', () => {
    const companyId = 'company-123';
    const request = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
    } as any;
    const analysis: QueryAnalysis = {
      intent: 'find_information',
      searchQueries: ['refund policy', 'return policy', 'money back guarantee'],
      keywords: ['refund', 'policy'],
      confidence: 0.8,
      needsClarification: false,
    };

    it('should perform smart search with reranking', async () => {
      const mockFilter: QdrantFilter = {
        must: [
          { key: 'companyId', match: { value: companyId } },
          { key: 'fileId', match: { any: ['file-1', 'file-2'] } },
        ],
      };

      const mockBuildFilter = jest.spyOn(SmartAgentV2Service as any, 'buildFilter');
      mockBuildFilter.mockResolvedValue(mockFilter);

      // Mock embeddings for 3 queries
      mockVectorService.getEmbeddings.mockResolvedValue([
        [0.1, 0.2, 0.3], // query 1
        [0.4, 0.5, 0.6], // query 2
        [0.7, 0.8, 0.9], // query 3
      ]);

      // Mock search results for each query
      mockVectorService.search
        .mockResolvedValueOnce([
          { id: 'chunk-1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
          { id: 'chunk-2', score: 0.8, payload: { fileId: 'file-1', chunkIndex: 1 } },
        ])
        .mockResolvedValueOnce([
          { id: 'chunk-3', score: 0.85, payload: { fileId: 'file-2', chunkIndex: 0 } },
        ])
        .mockResolvedValueOnce([
          { id: 'chunk-4', score: 0.7, payload: { fileId: 'file-1', chunkIndex: 2 } },
        ]);

      const mockCombineWithRRF = jest.spyOn(SmartAgentV2Service as any, 'combineWithRRF');
      const combinedResults: SearchResult[] = [
        { id: 'chunk-1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
        { id: 'chunk-2', score: 0.8, payload: { fileId: 'file-1', chunkIndex: 1 } },
      ];
      mockCombineWithRRF.mockReturnValue(combinedResults);

      const mockEnrichSources = jest.spyOn(SmartAgentV2Service as any, 'enrichSources');
      const enrichedSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Refund policy content',
          score: 0.9,
          citationNumber: 1,
        },
      ];
      mockEnrichSources.mockResolvedValue(enrichedSources);

      const mockNeedsReranking = jest.spyOn(SmartAgentV2Service as any, 'needsReranking');
      mockNeedsReranking.mockReturnValue(true);

      const mockRerank = jest.spyOn(SmartAgentV2Service as any, 'rerank');
      mockRerank.mockResolvedValue(enrichedSources);

      const result = await (SmartAgentV2Service as any).searchSmart(companyId, request, analysis);

      expect(result).toEqual(enrichedSources);
      expect(mockVectorService.getEmbeddings).toHaveBeenCalledWith(
        ['refund policy', 'return policy', 'money back guarantee'],
        'query',
        undefined
      );
      expect(mockVectorService.search).toHaveBeenCalledTimes(3);
      expect(mockCombineWithRRF).toHaveBeenCalled();
      expect(mockRerank).toHaveBeenCalledWith(request.query, enrichedSources, 10);
    });

    it('should skip reranking when smart reranking determines it is not needed', async () => {
      const mockBuildFilter = jest.spyOn(SmartAgentV2Service as any, 'buildFilter');
      mockBuildFilter.mockResolvedValue({
        must: [
          { key: 'companyId', match: { value: companyId } },
          { key: 'fileId', match: { any: ['file-1'] } },
        ],
      });

      mockVectorService.getEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]]);
      mockVectorService.search.mockResolvedValue([
        { id: 'chunk-1', score: 0.95, payload: { fileId: 'file-1', chunkIndex: 0 } },
      ]);

      const mockCombineWithRRF = jest.spyOn(SmartAgentV2Service as any, 'combineWithRRF');
      mockCombineWithRRF.mockReturnValue([
        { id: 'chunk-1', score: 5.5, payload: { fileId: 'file-1', chunkIndex: 0 } }, // High RRF score
      ]);

      const mockEnrichSources = jest.spyOn(SmartAgentV2Service as any, 'enrichSources');
      const enrichedSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Refund policy content',
          score: 5.5,
          citationNumber: 1,
        },
      ];
      mockEnrichSources.mockResolvedValue(enrichedSources);

      const mockNeedsReranking = jest.spyOn(SmartAgentV2Service as any, 'needsReranking');
      mockNeedsReranking.mockReturnValue(false); // Smart reranking says skip

      const result = await (SmartAgentV2Service as any).searchSmart(companyId, request, analysis);

      expect(result).toEqual(enrichedSources);
      expect(mockVectorService.rerank).not.toHaveBeenCalled();
    });
  });

  describe('searchDeep', () => {
    const companyId = 'company-123';
    const request = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
    } as any;
    const analysis: QueryAnalysis = {
      intent: 'find_information',
      searchQueries: [
        'refund policy',
        'return policy',
        'money back guarantee',
        'cancellation terms',
      ],
      keywords: ['refund', 'policy'],
      confidence: 0.8,
      needsClarification: false,
    };

    it('should perform deep search with context expansion', async () => {
      const mockFilter: QdrantFilter = {
        must: [
          { key: 'companyId', match: { value: companyId } },
          { key: 'fileId', match: { any: ['file-1', 'file-2'] } },
        ],
      };

      const mockBuildFilter = jest.spyOn(SmartAgentV2Service as any, 'buildFilter');
      mockBuildFilter.mockResolvedValue(mockFilter);

      // Mock embeddings for 4 queries
      mockVectorService.getEmbeddings.mockResolvedValue([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
        [0.2, 0.3, 0.4],
      ]);

      // Mock search results
      mockVectorService.search.mockResolvedValue([
        { id: 'chunk-1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
      ]);

      const mockCombineWithRRF = jest.spyOn(SmartAgentV2Service as any, 'combineWithRRF');
      mockCombineWithRRF.mockReturnValue([
        { id: 'chunk-1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
      ]);

      const mockEnrichSources = jest.spyOn(SmartAgentV2Service as any, 'enrichSources');
      const enrichedSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Refund policy content',
          score: 0.9,
          citationNumber: 1,
        },
      ];
      mockEnrichSources.mockResolvedValue(enrichedSources);

      const mockExpandContext = jest.spyOn(SmartAgentV2Service as any, 'expandContext');
      mockExpandContext.mockResolvedValue(enrichedSources);

      const result = await (SmartAgentV2Service as any).searchDeep(companyId, request, analysis);

      expect(result).toEqual(enrichedSources);
      expect(mockVectorService.getEmbeddings).toHaveBeenCalledWith(
        ['refund policy', 'return policy', 'money back guarantee', 'cancellation terms'],
        'query',
        undefined
      );
      expect(mockVectorService.search).toHaveBeenCalledTimes(4);
      expect(mockExpandContext).toHaveBeenCalledWith(enrichedSources, companyId);
    });

    it('should always rerank in deep mode', async () => {
      const mockBuildFilter = jest.spyOn(SmartAgentV2Service as any, 'buildFilter');
      mockBuildFilter.mockResolvedValue({
        must: [
          { key: 'companyId', match: { value: companyId } },
          { key: 'fileId', match: { any: ['file-1'] } },
        ],
      });

      mockVectorService.getEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]]);
      mockVectorService.search.mockResolvedValue([
        { id: 'chunk-1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
      ]);

      const mockCombineWithRRF = jest.spyOn(SmartAgentV2Service as any, 'combineWithRRF');
      mockCombineWithRRF.mockReturnValue([
        { id: 'chunk-1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
      ]);

      const mockEnrichSources = jest.spyOn(SmartAgentV2Service as any, 'enrichSources');
      const enrichedSources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'policies.pdf',
          chunkIndex: 0,
          content: 'Refund policy content',
          score: 0.9,
          citationNumber: 1,
        },
      ];
      mockEnrichSources.mockResolvedValue(enrichedSources);

      const mockRerank = jest.spyOn(SmartAgentV2Service as any, 'rerank');
      mockRerank.mockResolvedValue(enrichedSources);

      await (SmartAgentV2Service as any).searchDeep(companyId, request, analysis);

      expect(mockRerank).toHaveBeenCalledWith(request.query, enrichedSources, 15);
    });
  });

  describe('buildFilter', () => {
    const companyId = 'company-123';
    const request = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
    } as any;

    it('should build filter successfully', async () => {
      const mockProject = {
        _id: request.projectId,
        companyId,
        name: 'Test Project',
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockFileMetadataRepository.findByProjectId.mockResolvedValue([
        { _id: 'file-1', originalFilename: 'policies.pdf' },
        { _id: 'file-2', originalFilename: 'terms.pdf' },
      ]);

      const result = await (SmartAgentV2Service as any).buildFilter(request, companyId);

      expect(result).toEqual({
        must: [
          { key: 'companyId', match: { value: companyId } },
          { key: 'fileId', match: { any: ['file-1', 'file-2'] } },
        ],
      });
    });

    it('should throw error when project not found', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect((SmartAgentV2Service as any).buildFilter(request, companyId)).rejects.toThrow(
        'Project not found or access denied'
      );
    });

    it('should throw error when project belongs to different company', async () => {
      const mockProject = {
        _id: request.projectId,
        companyId: 'different-company',
        name: 'Test Project',
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);

      await expect((SmartAgentV2Service as any).buildFilter(request, companyId)).rejects.toThrow(
        'Project not found or access denied'
      );
    });

    it('should return undefined when project has no files', async () => {
      const mockProject = {
        _id: request.projectId,
        companyId,
        name: 'Test Project',
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockFileMetadataRepository.findByProjectId.mockResolvedValue([]);

      const result = await (SmartAgentV2Service as any).buildFilter(request, companyId);

      expect(result).toBeUndefined();
    });

    it('should handle fileId filter', async () => {
      const requestWithFileId = {
        ...request,
        filter: { fileId: 'file-1' },
      };

      const mockProject = {
        _id: request.projectId,
        companyId,
        name: 'Test Project',
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockFileMetadataRepository.findByProjectId.mockResolvedValue([
        { _id: 'file-1', originalFilename: 'policies.pdf' },
        { _id: 'file-2', originalFilename: 'terms.pdf' },
      ]);

      const result = await (SmartAgentV2Service as any).buildFilter(requestWithFileId, companyId);

      expect(result).toEqual({
        must: [
          { key: 'companyId', match: { value: companyId } },
          { key: 'fileId', match: { value: 'file-1' } },
        ],
      });
    });

    it('should return undefined when fileId not in project', async () => {
      const requestWithFileId = {
        ...request,
        filter: { fileId: 'file-not-in-project' },
      };

      const mockProject = {
        _id: request.projectId,
        companyId,
        name: 'Test Project',
      };

      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockFileMetadataRepository.findByProjectId.mockResolvedValue([
        { _id: 'file-1', originalFilename: 'policies.pdf' },
      ]);

      const result = await (SmartAgentV2Service as any).buildFilter(requestWithFileId, companyId);

      expect(result).toBeUndefined();
    });
  });

  describe('combineWithRRF', () => {
    it('should combine results using Reciprocal Rank Fusion', () => {
      const resultSets: SearchResult[][] = [
        [
          { id: 'chunk-1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
          { id: 'chunk-2', score: 0.8, payload: { fileId: 'file-1', chunkIndex: 1 } },
        ],
        [
          { id: 'chunk-1', score: 0.85, payload: { fileId: 'file-1', chunkIndex: 0 } },
          { id: 'chunk-3', score: 0.7, payload: { fileId: 'file-2', chunkIndex: 0 } },
        ],
      ];

      const result = (SmartAgentV2Service as any).combineWithRRF(resultSets);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('chunk-1'); // Should be highest ranked due to appearing in both sets
      expect(result[0].score).toBeGreaterThan(result[1].score);
      // Scores should be normalized (multiplied by 100)
      expect(result[0].score).toBeGreaterThan(1);
    });

    it('should handle empty result sets', () => {
      const result = (SmartAgentV2Service as any).combineWithRRF([]);

      expect(result).toEqual([]);
    });

    it('should handle result sets with different lengths', () => {
      const resultSets: SearchResult[][] = [
        [{ id: 'chunk-1', score: 0.9, payload: {} }],
        [
          { id: 'chunk-1', score: 0.8, payload: {} },
          { id: 'chunk-2', score: 0.7, payload: {} },
          { id: 'chunk-3', score: 0.6, payload: {} },
        ],
      ];

      const result = (SmartAgentV2Service as any).combineWithRRF(resultSets);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('chunk-1'); // Highest score due to dual ranking
    });
  });

  describe('needsReranking', () => {
    it('should return false for small result sets', () => {
      const sources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'test.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 0.9,
          citationNumber: 1,
        },
      ];

      const result = (SmartAgentV2Service as any).needsReranking(sources);

      expect(result).toBe(false);
    });

    it('should return false for dominant top result', () => {
      const sources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'test.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 5.5,
          citationNumber: 1,
        }, // High RRF score
        {
          fileId: 'file-2',
          fileName: 'test2.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 4.2,
          citationNumber: 2,
        },
        {
          fileId: 'file-3',
          fileName: 'test3.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 3.8,
          citationNumber: 3,
        },
      ];

      const result = (SmartAgentV2Service as any).needsReranking(sources);

      expect(result).toBe(false);
    });

    it('should return false for high average top 3 scores', () => {
      const sources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'test.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 4.5,
          citationNumber: 1,
        },
        {
          fileId: 'file-2',
          fileName: 'test2.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 4.2,
          citationNumber: 2,
        },
        {
          fileId: 'file-3',
          fileName: 'test3.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 4.8,
          citationNumber: 3,
        },
      ];

      const result = (SmartAgentV2Service as any).needsReranking(sources);

      expect(result).toBe(false);
    });

    it('should return true for lower quality results needing reranking', () => {
      const sources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'test.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 2.5,
          citationNumber: 1,
        },
        {
          fileId: 'file-2',
          fileName: 'test2.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 2.3,
          citationNumber: 2,
        },
        {
          fileId: 'file-3',
          fileName: 'test3.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 2.1,
          citationNumber: 3,
        },
      ];

      const result = (SmartAgentV2Service as any).needsReranking(sources);

      expect(result).toBe(true);
    });
  });

  describe('enrichSources', () => {
    it('should enrich search results with file metadata', async () => {
      const results: SearchResult[] = [
        {
          id: 'chunk-1',
          score: 0.9,
          payload: {
            fileId: 'file-1',
            chunkIndex: 0,
            content: 'Full content from DB',
            text_preview: 'Preview text',
          },
        },
        {
          id: 'chunk-2',
          score: 0.8,
          payload: {
            fileId: 'file-1',
            chunkIndex: 1,
            content: 'Second chunk content',
          },
        },
      ];

      mockFileMetadataRepository.findByIds.mockResolvedValue([
        {
          _id: 'file-1',
          originalFilename: 'policies.pdf',
          filename: 'policies.pdf',
        },
      ]);

      const enriched = await (SmartAgentV2Service as any).enrichSources(results);

      expect(enriched).toHaveLength(2);
      expect(enriched[0]).toMatchObject({
        fileId: 'file-1',
        fileName: 'policies.pdf',
        chunkIndex: 0,
        content: 'Full content from DB',
        score: 0.9,
        citationNumber: 1,
      });
      expect(enriched[1]).toMatchObject({
        fileId: 'file-1',
        fileName: 'policies.pdf',
        chunkIndex: 1,
        content: 'Second chunk content',
        score: 0.8,
        citationNumber: 2,
      });
    });

    it('should handle missing file metadata gracefully', async () => {
      const results: SearchResult[] = [
        {
          id: 'chunk-1',
          score: 0.9,
          payload: {
            fileId: 'file-1',
            chunkIndex: 0,
            content: 'Content',
          },
        },
      ];

      mockFileMetadataRepository.findByIds.mockResolvedValue([]);

      const enriched = await (SmartAgentV2Service as any).enrichSources(results);

      expect(enriched[0].fileName).toBe('Unknown');
    });

    it('should fall back to text_preview when content is missing', async () => {
      const results: SearchResult[] = [
        {
          id: 'chunk-1',
          score: 0.9,
          payload: {
            fileId: 'file-1',
            chunkIndex: 0,
            text_preview: 'Preview content',
          },
        },
      ];

      mockFileMetadataRepository.findByIds.mockResolvedValue([
        { _id: 'file-1', originalFilename: 'test.pdf' },
      ]);

      const enriched = await (SmartAgentV2Service as any).enrichSources(results);

      expect(enriched[0].content).toBe('Preview content');
    });
  });

  describe('generateAnswer', () => {
    const query = 'What is the refund policy?';
    const sources: ChatV2Source[] = [
      {
        fileId: 'file-1',
        fileName: 'policies.pdf',
        chunkIndex: 0,
        content: 'Our refund policy allows returns within 30 days.',
        score: 0.9,
        citationNumber: 1,
      },
    ];
    const request = {
      query,
      projectId: 'project-456',
    };

    it('should generate answer successfully', async () => {
      const mockResponse = 'Our refund policy allows returns within 30 days for a full refund [1].';
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: mockResponse,
            },
          },
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 50,
          total_tokens: 250,
        },
      });

      const result = await (SmartAgentV2Service as any).generateAnswer(query, sources, request);

      expect(result.answer).toBe(mockResponse);
      expect(result.usage).toEqual({
        promptTokens: 200,
        completionTokens: 50,
        totalTokens: 250,
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: query }),
        ]),
        max_tokens: 1000,
        temperature: 0.5,
      });
    });

    it('should handle timeout errors', async () => {
      mockWithTimeout.mockRejectedValueOnce(new TimeoutError('Answer generation timed out'));

      await expect(
        (SmartAgentV2Service as any).generateAnswer(query, sources, request)
      ).rejects.toThrow(TimeoutError);
    });

    it('should use conversation history when provided', async () => {
      const requestWithHistory = {
        ...request,
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      } as any;

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Answer with history context',
            },
          },
        ],
        usage: {
          prompt_tokens: 250,
          completion_tokens: 30,
          total_tokens: 280,
        },
      });

      await (SmartAgentV2Service as any).generateAnswer(query, sources, requestWithHistory);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Hello' }),
            expect.objectContaining({ role: 'assistant', content: 'Hi there!' }),
            expect.objectContaining({ role: 'user', content: query }),
          ]),
        })
      );
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate confidence for fast mode scores', () => {
      const sources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'test.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 0.9,
          citationNumber: 1,
        },
        {
          fileId: 'file-2',
          fileName: 'test2.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 0.8,
          citationNumber: 2,
        },
      ];

      const result = (SmartAgentV2Service as any).calculateConfidence(sources);

      expect(result).toBe(0.85); // Average of 0.9 and 0.8
    });

    it('should calculate confidence for RRF scores', () => {
      const sources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'test.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 4.2,
          citationNumber: 1,
        }, // RRF score
        {
          fileId: 'file-2',
          fileName: 'test2.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 3.8,
          citationNumber: 2,
        },
      ];

      const result = (SmartAgentV2Service as any).calculateConfidence(sources);

      expect(result).toBe(0.4); // Average of 4.2 and 3.8, divided by 10
    });

    it('should calculate confidence for reranked scores', () => {
      const sources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'test.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 85,
          citationNumber: 1,
        }, // Reranked score 0-100
        {
          fileId: 'file-2',
          fileName: 'test2.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 75,
          citationNumber: 2,
        },
      ];

      const result = (SmartAgentV2Service as any).calculateConfidence(sources);

      expect(result).toBe(0.8); // Average of 85 and 75, divided by 100
    });

    it('should return 0 for empty sources', () => {
      const result = (SmartAgentV2Service as any).calculateConfidence([]);

      expect(result).toBe(0);
    });

    it('should clamp confidence to maximum 1.0', () => {
      const sources: ChatV2Source[] = [
        {
          fileId: 'file-1',
          fileName: 'test.pdf',
          chunkIndex: 0,
          content: 'content',
          score: 2.0,
          citationNumber: 1,
        },
      ];

      const result = (SmartAgentV2Service as any).calculateConfidence(sources);

      expect(result).toBe(1.0); // Should be clamped
    });
  });

  describe('generateFollowUps', () => {
    const query = 'What is the refund policy?';
    const answer = 'Our refund policy allows returns within 30 days for a full refund.';

    it('should generate follow-up questions successfully', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                followups: ['How long do returns take?', 'What items are eligible for return?'],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
      });

      const result = await (SmartAgentV2Service as any).generateFollowUps(query, answer);

      expect(result).toEqual(['How long do returns take?', 'What items are eligible for return?']);
    });

    it('should handle timeout gracefully', async () => {
      mockWithTimeout.mockRejectedValueOnce(new TimeoutError('Follow-up generation timed out'));

      const result = await (SmartAgentV2Service as any).generateFollowUps(query, answer);

      expect(result).toEqual([]);
    });

    it('should handle malformed JSON response', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
        usage: { prompt_tokens: 80, completion_tokens: 20, total_tokens: 100 },
      });

      const result = await (SmartAgentV2Service as any).generateFollowUps(query, answer);

      expect(result).toEqual([]);
    });
  });

  describe('chatStream', () => {
    const companyId = 'company-123';
    const request = {
      query: 'What is the refund policy?',
      projectId: 'project-456',
      includeMetadata: true,
    };

    it('should stream chat response successfully', async () => {
      const mockAnalysis: QueryAnalysis = {
        intent: 'find_information',
        searchQueries: ['refund policy'],
        keywords: ['refund', 'policy'],
        confidence: 0.9,
        needsClarification: false,
      };

      mockOpenAIClient.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify(mockAnalysis),
              },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        })
        .mockResolvedValueOnce({
          choices: [
            { delta: { content: 'Our' }, index: 0 },
            { delta: { content: ' refund' }, index: 0 },
            { delta: { content: ' policy' }, index: 0 },
          ],
          usage: {
            prompt_tokens: 200,
            completion_tokens: 50,
            total_tokens: 250,
          },
        });

      mockConversationRepository.findByIdWithCache.mockResolvedValue(null);

      const mockRetrieveContext = jest.spyOn(
        SmartAgentV2Service as any,
        'retrieveContextWithCaching'
      );
      mockRetrieveContext.mockResolvedValue({
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
        usedCache: false,
      });

      const mockGenerateFollowUps = jest.spyOn(SmartAgentV2Service as any, 'generateFollowUps');
      mockGenerateFollowUps.mockResolvedValue(['How long do returns take?']);

      const events: any[] = [];
      const onEvent = (event: any) => events.push(event);

      await (SmartAgentV2Service.chatStream as any)(companyId, request, onEvent);

      expect(events).toContainEqual({
        type: 'analysis',
        data: { analysis: mockAnalysis },
      });
      expect(events).toContainEqual({
        type: 'sources',
        data: { sources: expect.any(Array) },
      });
      expect(events).toContainEqual({
        type: 'token',
        data: { token: 'Our' },
      });
      expect(events).toContainEqual({
        type: 'token',
        data: { token: ' refund' },
      });
      expect(events).toContainEqual({
        type: 'token',
        data: { token: ' policy' },
      });
      expect(events).toContainEqual({
        type: 'followups',
        data: { followups: ['How long do returns take?'] },
      });
      expect(events).toContainEqual({
        type: 'done',
        data: expect.objectContaining({
          usage: expect.any(Object),
          confidence: expect.any(Number),
          searchMode: 'smart',
          processingTime: expect.any(Number),
        }),
      });
    });

    it('should handle greeting in streaming mode', async () => {
      const greetingRequest = {
        ...request,
        query: 'Hello there!',
      };

      const mockAnalysis: QueryAnalysis = {
        intent: 'greeting',
        searchQueries: ['hello'],
        keywords: ['hello'],
        confidence: 0.95,
        needsClarification: false,
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      });

      const events: any[] = [];
      const onEvent = (event: any) => events.push(event);

      await (SmartAgentV2Service.chatStream as any)(companyId, greetingRequest, onEvent);

      expect(events).toContainEqual({
        type: 'token',
        data: {
          token:
            "Hello! I'm here to help you find information in your documents. What would you like to know?",
        },
      });
      expect(events).toContainEqual({
        type: 'done',
        data: expect.objectContaining({
          model: 'gpt-4o-mini',
          provider: 'openai',
          searchMode: 'smart',
        }),
      });
    });

    it('should handle streaming errors', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('Streaming failed'));

      const events: any[] = [];
      const onEvent = (event: any) => events.push(event);

      await (SmartAgentV2Service.chatStream as any)(companyId, request, onEvent);

      expect(events).toContainEqual({
        type: 'error',
        data: {
          message: 'Streaming failed',
        },
      });
    });

    it('should handle timeout errors in streaming', async () => {
      mockWithTimeout.mockRejectedValueOnce(new TimeoutError('Streaming timed out'));

      const events: any[] = [];
      const onEvent = (event: any) => events.push(event);

      await (SmartAgentV2Service.chatStream as any)(companyId, request, onEvent);

      expect(events).toContainEqual({
        type: 'error',
        data: {
          message: 'OpenAI streaming timed out',
          error: 'timeout',
          timeout: 60000,
        },
      });
    });
  });
});
