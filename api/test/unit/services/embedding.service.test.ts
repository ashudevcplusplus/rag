import { EmbeddingService } from '../../../src/services/embedding.service';
import { ExternalServiceError } from '../../../src/types/error.types';
import { CONFIG } from '../../../src/config';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('EmbeddingService', () => {
  let mockOpenAIInstance: {
    embeddings: {
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock OpenAI instance
    mockOpenAIInstance = {
      embeddings: {
        create: jest.fn(),
      },
    };

    // Mock OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => {
      return mockOpenAIInstance as unknown as OpenAI;
    });

    // Set API key in config for tests
    (CONFIG as { OPENAI_API_KEY: string }).OPENAI_API_KEY = 'test-api-key';
    (CONFIG as { OPENAI_EMBEDDING_MODEL: string }).OPENAI_EMBEDDING_MODEL =
      'text-embedding-3-small';
  });

  afterEach(() => {
    // Reset the private openai client between tests
    (EmbeddingService as any).openai = null;
  });

  describe('getEmbeddings', () => {
    it('should successfully get embeddings for single text', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      mockOpenAIInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0 }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 5, total_tokens: 5 },
      });

      const texts = ['test text'];
      const result = await EmbeddingService.getEmbeddings(texts);

      expect(result).toEqual([mockEmbedding]);
      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      });
    });

    it('should successfully get embeddings for multiple texts', async () => {
      const mockEmbedding1 = Array(1536).fill(0.1);
      const mockEmbedding2 = Array(1536).fill(0.2);
      const mockEmbedding3 = Array(1536).fill(0.3);

      mockOpenAIInstance.embeddings.create.mockResolvedValue({
        data: [
          { embedding: mockEmbedding1, index: 0 },
          { embedding: mockEmbedding2, index: 1 },
          { embedding: mockEmbedding3, index: 2 },
        ],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 15, total_tokens: 15 },
      });

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await EmbeddingService.getEmbeddings(texts);

      expect(result).toEqual([mockEmbedding1, mockEmbedding2, mockEmbedding3]);
      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledTimes(1);
    });

    it('should return empty array for empty input', async () => {
      const result = await EmbeddingService.getEmbeddings([]);

      expect(result).toEqual([]);
      expect(mockOpenAIInstance.embeddings.create).not.toHaveBeenCalled();
    });

    it('should handle batching for large number of texts', async () => {
      const mockEmbedding = Array(1536).fill(0.1);

      // Create 250 texts to trigger batching (batch size is 100)
      const texts = Array(250)
        .fill(0)
        .map((_, i) => `text ${i}`);

      // Mock responses for 3 batches
      mockOpenAIInstance.embeddings.create.mockImplementation(
        async (params: { input: string[] }) => {
          const batchSize = params.input.length;
          return {
            data: Array(batchSize)
              .fill(0)
              .map((_, i) => ({ embedding: mockEmbedding, index: i })),
            model: 'text-embedding-3-small',
            object: 'list',
            usage: { prompt_tokens: batchSize * 5, total_tokens: batchSize * 5 },
          };
        }
      );

      const result = await EmbeddingService.getEmbeddings(texts);

      expect(result.length).toBe(250);
      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledTimes(3); // 100, 100, 50
    });

    it('should throw error when API key is not set', async () => {
      (CONFIG as { OPENAI_API_KEY: string }).OPENAI_API_KEY = '';
      // Reset client to force re-initialization
      (EmbeddingService as any).openai = null;

      await expect(EmbeddingService.getEmbeddings(['test'])).rejects.toThrow(ExternalServiceError);
      await expect(EmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        'OPENAI_API_KEY environment variable is not set'
      );
    });

    it('should throw ExternalServiceError when OpenAI API returns error', async () => {
      mockOpenAIInstance.embeddings.create.mockRejectedValue(new Error('Invalid API key provided'));

      await expect(EmbeddingService.getEmbeddings(['test'])).rejects.toThrow(ExternalServiceError);
      await expect(EmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        'Batch 1 failed: Invalid API key provided'
      );
    });

    it('should throw ExternalServiceError for rate limit errors', async () => {
      mockOpenAIInstance.embeddings.create.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(EmbeddingService.getEmbeddings(['test'])).rejects.toThrow(ExternalServiceError);
      await expect(EmbeddingService.getEmbeddings(['test'])).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw ExternalServiceError for timeout errors', async () => {
      mockOpenAIInstance.embeddings.create.mockRejectedValue(new Error('Request timeout'));

      await expect(EmbeddingService.getEmbeddings(['test'])).rejects.toThrow(ExternalServiceError);
      await expect(EmbeddingService.getEmbeddings(['test'])).rejects.toThrow('Request timeout');
    });

    it('should throw error when batch processing fails', async () => {
      const texts = Array(150)
        .fill(0)
        .map((_, i) => `text ${i}`);

      const mockEmbedding = Array(1536).fill(0.1);

      // First batch succeeds, second batch fails
      mockOpenAIInstance.embeddings.create
        .mockResolvedValueOnce({
          data: Array(100)
            .fill(0)
            .map((_, i) => ({ embedding: mockEmbedding, index: i })),
          model: 'text-embedding-3-small',
          object: 'list',
          usage: { prompt_tokens: 500, total_tokens: 500 },
        })
        .mockRejectedValueOnce(new Error('Network error'));

      try {
        await EmbeddingService.getEmbeddings(texts);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ExternalServiceError);
        expect((error as Error).message).toContain('Batch 2 failed');
        expect((error as Error).message).toContain('Network error');
      }
    });

    it('should throw error when embeddings count mismatch', async () => {
      const mockEmbedding = Array(1536).fill(0.1);

      // Return fewer embeddings than expected
      mockOpenAIInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0 }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const texts = ['text 1', 'text 2', 'text 3'];

      await expect(EmbeddingService.getEmbeddings(texts)).rejects.toThrow(ExternalServiceError);
      await expect(EmbeddingService.getEmbeddings(texts)).rejects.toThrow(
        'Expected 3 embeddings but received 1'
      );
    });

    it('should sort embeddings by index', async () => {
      const mockEmbedding1 = Array(1536).fill(0.1);
      const mockEmbedding2 = Array(1536).fill(0.2);
      const mockEmbedding3 = Array(1536).fill(0.3);

      // Return embeddings in wrong order
      mockOpenAIInstance.embeddings.create.mockResolvedValue({
        data: [
          { embedding: mockEmbedding3, index: 2 },
          { embedding: mockEmbedding1, index: 0 },
          { embedding: mockEmbedding2, index: 1 },
        ],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 15, total_tokens: 15 },
      });

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await EmbeddingService.getEmbeddings(texts);

      // Should be sorted correctly
      expect(result).toEqual([mockEmbedding1, mockEmbedding2, mockEmbedding3]);
    });

    it('should reuse OpenAI client instance', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      mockOpenAIInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0 }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 5, total_tokens: 5 },
      });

      await EmbeddingService.getEmbeddings(['test 1']);
      await EmbeddingService.getEmbeddings(['test 2']);

      // OpenAI constructor should only be called once
      expect(OpenAI).toHaveBeenCalledTimes(1);
    });
  });
});
