import { GeminiEmbeddingService } from '../../../src/services/gemini-embedding.service';
import { ExternalServiceError } from '../../../src/types/error.types';
import { CONFIG } from '../../../src/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock Google Generative AI
jest.mock('@google/generative-ai');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('GeminiEmbeddingService', () => {
  let mockGenAIInstance: GoogleGenerativeAI;
  let mockModel: {
    embedContent: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock model
    mockModel = {
      embedContent: jest.fn(),
    };

    // Setup mock GenerativeModel
    mockGenAIInstance = {
      getGenerativeModel: jest.fn(() => mockModel),
    } as unknown as GoogleGenerativeAI;

    // Mock GoogleGenerativeAI constructor
    (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => {
      return mockGenAIInstance;
    });

    // Set API key in config for tests
    (CONFIG as { GEMINI_API_KEY: string }).GEMINI_API_KEY = 'test-api-key';
    (CONFIG as { GEMINI_EMBEDDING_MODEL: string }).GEMINI_EMBEDDING_MODEL =
      'models/text-embedding-004';
  });

  afterEach(() => {
    // Reset the private genAI client between tests
    (GeminiEmbeddingService as any).genAI = null;
  });

  describe('getEmbeddings', () => {
    it('should successfully get embeddings for single text', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      mockModel.embedContent.mockResolvedValue({
        embedding: {
          values: mockEmbedding,
        },
      });

      const texts = ['Test text'];
      const result = await GeminiEmbeddingService.getEmbeddings(texts);

      expect(result).toEqual([mockEmbedding]);
      expect(mockModel.embedContent).toHaveBeenCalledWith({
        content: 'Test text',
        taskType: 'retrieval_document',
      });
    });

    it('should successfully get embeddings for multiple texts', async () => {
      const mockEmbedding1 = Array(768).fill(0.1);
      const mockEmbedding2 = Array(768).fill(0.2);
      const mockEmbedding3 = Array(768).fill(0.3);

      mockModel.embedContent
        .mockResolvedValueOnce({
          embedding: { values: mockEmbedding1 },
        })
        .mockResolvedValueOnce({
          embedding: { values: mockEmbedding2 },
        })
        .mockResolvedValueOnce({
          embedding: { values: mockEmbedding3 },
        });

      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const result = await GeminiEmbeddingService.getEmbeddings(texts);

      expect(result).toEqual([mockEmbedding1, mockEmbedding2, mockEmbedding3]);
      expect(mockModel.embedContent).toHaveBeenCalledTimes(3);
    });

    it('should return empty array for empty input', async () => {
      const result = await GeminiEmbeddingService.getEmbeddings([]);

      expect(result).toEqual([]);
      expect(mockModel.embedContent).not.toHaveBeenCalled();
    });

    it('should handle batching for large text arrays', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const texts = Array(150).fill('Test text');

      mockModel.embedContent.mockResolvedValue({
        embedding: {
          values: mockEmbedding,
        },
      });

      const result = await GeminiEmbeddingService.getEmbeddings(texts);

      expect(result).toHaveLength(150);
      expect(mockModel.embedContent).toHaveBeenCalledTimes(150);
    });

    it('should use retrieval_query task type when specified', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      mockModel.embedContent.mockResolvedValue({
        embedding: {
          values: mockEmbedding,
        },
      });

      const texts = ['Query text'];
      await GeminiEmbeddingService.getEmbeddings(texts, {
        taskType: 'retrieval_query',
      });

      expect(mockModel.embedContent).toHaveBeenCalledWith({
        content: 'Query text',
        taskType: 'retrieval_query',
      });
    });

    it('should include title when provided', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      mockModel.embedContent.mockResolvedValue({
        embedding: {
          values: mockEmbedding,
        },
      });

      const texts = ['Document text'];
      await GeminiEmbeddingService.getEmbeddings(texts, {
        title: 'Document Title',
      });

      expect(mockModel.embedContent).toHaveBeenCalledWith({
        content: 'Document text',
        taskType: 'retrieval_document',
        title: 'Document Title',
      });
    });

    it('should include outputDimensionality for gemini-embedding-001', async () => {
      (CONFIG as { GEMINI_EMBEDDING_MODEL: string }).GEMINI_EMBEDDING_MODEL =
        'models/gemini-embedding-001';

      const mockEmbedding = Array(1536).fill(0.1);
      mockModel.embedContent.mockResolvedValue({
        embedding: {
          values: mockEmbedding,
        },
      });

      const texts = ['Test text'];
      await GeminiEmbeddingService.getEmbeddings(texts, {
        outputDimensionality: 1536,
      });

      expect(mockModel.embedContent).toHaveBeenCalledWith({
        content: 'Test text',
        taskType: 'retrieval_document',
        outputDimensionality: 1536,
      });
    });

    it('should throw error when API key is not set', async () => {
      (CONFIG as { GEMINI_API_KEY: string }).GEMINI_API_KEY = '';
      (GeminiEmbeddingService as any).genAI = null;

      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        ExternalServiceError
      );
      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        'GEMINI_API_KEY environment variable is not set'
      );
    });

    it('should throw error when API call fails', async () => {
      mockModel.embedContent.mockRejectedValue(new Error('API error'));

      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        ExternalServiceError
      );
      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow('API error');
    });

    it('should throw error when rate limit is exceeded', async () => {
      mockModel.embedContent.mockRejectedValue(new Error('rate limit exceeded'));

      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        ExternalServiceError
      );
      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should throw error when quota is exceeded', async () => {
      mockModel.embedContent.mockRejectedValue(new Error('quota exceeded'));

      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        ExternalServiceError
      );
      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        'Quota exceeded'
      );
    });

    it('should throw error when embedding count mismatch', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      mockModel.embedContent
        .mockResolvedValueOnce({
          embedding: { values: mockEmbedding },
        })
        .mockRejectedValueOnce(new Error('API error'));

      const texts = ['Text 1', 'Text 2'];

      await expect(GeminiEmbeddingService.getEmbeddings(texts)).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('should handle array response format', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      mockModel.embedContent.mockResolvedValue({
        embedding: mockEmbedding, // Direct array instead of { values: [...] }
      });

      const texts = ['Test text'];
      const result = await GeminiEmbeddingService.getEmbeddings(texts);

      expect(result).toEqual([mockEmbedding]);
    });

    it('should throw error when empty embedding is returned', async () => {
      mockModel.embedContent.mockResolvedValue({
        embedding: {
          values: [],
        },
      });

      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        ExternalServiceError
      );
      await expect(GeminiEmbeddingService.getEmbeddings(['test'])).rejects.toThrow(
        'Empty embedding returned from API'
      );
    });
  });

  describe('getEmbeddingDimensions', () => {
    it('should return 768 for text-embedding-004', () => {
      (CONFIG as { GEMINI_EMBEDDING_MODEL: string }).GEMINI_EMBEDDING_MODEL =
        'models/text-embedding-004';
      expect(GeminiEmbeddingService.getEmbeddingDimensions()).toBe(768);
    });

    it('should return 768 for text-embedding-005', () => {
      (CONFIG as { GEMINI_EMBEDDING_MODEL: string }).GEMINI_EMBEDDING_MODEL =
        'models/text-embedding-005';
      expect(GeminiEmbeddingService.getEmbeddingDimensions()).toBe(768);
    });

    it('should return configured dimensions for gemini-embedding-001', () => {
      (CONFIG as { GEMINI_EMBEDDING_MODEL: string }).GEMINI_EMBEDDING_MODEL =
        'models/gemini-embedding-001';
      (CONFIG as { GEMINI_EMBEDDING_DIMENSIONS: number }).GEMINI_EMBEDDING_DIMENSIONS = 1536;
      expect(GeminiEmbeddingService.getEmbeddingDimensions()).toBe(1536);
    });

    it('should return default 768 for gemini-embedding-001 when not configured', () => {
      (CONFIG as { GEMINI_EMBEDDING_MODEL: string }).GEMINI_EMBEDDING_MODEL =
        'models/gemini-embedding-001';
      (CONFIG as { GEMINI_EMBEDDING_DIMENSIONS: number | undefined }).GEMINI_EMBEDDING_DIMENSIONS =
        undefined;
      expect(GeminiEmbeddingService.getEmbeddingDimensions()).toBe(768);
    });

    it('should return 1408 for multimodalembedding', () => {
      (CONFIG as { GEMINI_EMBEDDING_MODEL: string }).GEMINI_EMBEDDING_MODEL =
        'models/multimodalembedding@001';
      expect(GeminiEmbeddingService.getEmbeddingDimensions()).toBe(1408);
    });

    it('should return 768 as default fallback', () => {
      (CONFIG as { GEMINI_EMBEDDING_MODEL: string }).GEMINI_EMBEDDING_MODEL = 'unknown-model';
      expect(GeminiEmbeddingService.getEmbeddingDimensions()).toBe(768);
    });
  });
});
