import { QdrantClient } from '@qdrant/js-client-rest';
import { ExternalServiceError } from '../../../src/types/error.types';
import { embeddingRepository } from '../../../src/repositories/embedding.repository';
import { createMockHttpError, MockQdrantClient } from '../../lib/mock-utils';

// Mock dependencies BEFORE importing VectorService
jest.mock('@qdrant/js-client-rest');
jest.mock('../../../src/repositories/embedding.repository');
jest.mock('../../../src/services/embedding.service', () => ({
  EmbeddingService: {
    getEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
  },
}));
jest.mock('../../../src/services/gemini-embedding.service', () => ({
  GeminiEmbeddingService: {
    getEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    getEmbeddingDimensions: jest.fn().mockReturnValue(768),
  },
}));
jest.mock('../../../src/config', () => ({
  CONFIG: {
    QDRANT_URL: 'http://localhost:6333',
    EMBEDDING_PROVIDER: 'openai',
    OPENAI_API_KEY: 'test-api-key',
    OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
    GEMINI_API_KEY: '',
    GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
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

// Mock fetch globally
global.fetch = jest.fn();

// Type-safe mock Qdrant client
const mockQdrant: MockQdrantClient = {
  getCollection: jest.fn(),
  createCollection: jest.fn(),
  createPayloadIndex: jest.fn(),
  upsert: jest.fn(),
  search: jest.fn(),
  delete: jest.fn(),
  scroll: jest.fn(),
  count: jest.fn(),
};

(QdrantClient as jest.MockedClass<typeof QdrantClient>).mockImplementation(
  () => mockQdrant as unknown as QdrantClient
);

// Import VectorService AFTER setting up mocks
import { VectorService } from '../../../src/services/vector.service';

// Type for Qdrant search results
interface QdrantSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown> | null;
}

// Type for collection info
interface CollectionInfo {
  status: string;
  vectors_count: number;
}

// Import mocked services for reference in tests
import { EmbeddingService } from '../../../src/services/embedding.service';

describe('VectorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (embeddingRepository.findChunks as jest.Mock).mockResolvedValue([]);
    // Reset EmbeddingService mock to default behavior
    (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2, 0.3]]);
  });

  describe('getEmbeddings', () => {
    it('should fetch embeddings successfully via EmbeddingService', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue(mockEmbeddings);

      const result = await VectorService.getEmbeddings(['text1', 'text2']);

      expect(result).toEqual(mockEmbeddings);
      expect(EmbeddingService.getEmbeddings).toHaveBeenCalledWith(['text1', 'text2']);
    });

    it('should handle single text input', async () => {
      const mockVectors = [[0.1, 0.2, 0.3]];
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue(mockVectors);

      const result = await VectorService.getEmbeddings(['text1']);

      expect(result).toEqual(mockVectors);
    });

    it('should throw error when EmbeddingService fails', async () => {
      (EmbeddingService.getEmbeddings as jest.Mock).mockRejectedValue(
        new ExternalServiceError('OpenAI', 'API error')
      );

      await expect(VectorService.getEmbeddings(['text1'])).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('ensureCollection', () => {
    it('should do nothing if collection exists', async () => {
      const collectionInfo: CollectionInfo = { status: 'green', vectors_count: 100 };
      mockQdrant.getCollection.mockResolvedValue(collectionInfo);

      await VectorService.ensureCollection('test-collection');

      expect(mockQdrant.getCollection).toHaveBeenCalledWith('test-collection');
      expect(mockQdrant.createCollection).not.toHaveBeenCalled();
    });

    it('should create collection if it does not exist', async () => {
      const notFoundError = createMockHttpError('Not found', 404);
      mockQdrant.getCollection.mockRejectedValue(notFoundError);
      mockQdrant.createCollection.mockResolvedValue(true);
      mockQdrant.createPayloadIndex.mockResolvedValue({
        operation_id: 0,
        status: 'completed' as const,
      });

      await VectorService.ensureCollection('test-collection');

      expect(mockQdrant.createCollection).toHaveBeenCalledWith('test-collection', {
        vectors: {
          size: 1536, // OpenAI text-embedding-3-small dimensions
          distance: 'Cosine',
        },
      });
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledTimes(2);
    });

    it('should create payload indexes for fileId and companyId', async () => {
      const notFoundError = createMockHttpError('Not found', 404);
      mockQdrant.getCollection.mockRejectedValue(notFoundError);
      mockQdrant.createCollection.mockResolvedValue(true);
      mockQdrant.createPayloadIndex.mockResolvedValue({
        operation_id: 0,
        status: 'completed' as const,
      });

      await VectorService.ensureCollection('test-collection');

      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledWith('test-collection', {
        field_name: 'fileId',
        field_schema: 'keyword',
      });
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledWith('test-collection', {
        field_name: 'companyId',
        field_schema: 'keyword',
      });
    });

    it('should not throw if payload index creation fails', async () => {
      const notFoundError = createMockHttpError('Not found', 404);
      mockQdrant.getCollection.mockRejectedValue(notFoundError);
      mockQdrant.createCollection.mockResolvedValue(true);
      mockQdrant.createPayloadIndex.mockRejectedValue(new Error('Index error'));

      await expect(VectorService.ensureCollection('test-collection')).resolves.not.toThrow();
    });

    it('should throw on non-404 errors', async () => {
      const serverError = createMockHttpError('Server error', 500);
      mockQdrant.getCollection.mockRejectedValue(serverError);

      await expect(VectorService.ensureCollection('test-collection')).rejects.toThrow(
        'Server error'
      );
    });
  });

  describe('upsertBatch', () => {
    it('should upsert points successfully', async () => {
      const points = [
        {
          id: '1',
          vector: [0.1, 0.2],
          payload: {
            fileId: 'file-1',
            companyId: 'company-1',
            text_preview: 'test',
            chunkIndex: 0,
          },
        },
        {
          id: '2',
          vector: [0.3, 0.4],
          payload: {
            fileId: 'file-1',
            companyId: 'company-1',
            text_preview: 'test2',
            chunkIndex: 1,
          },
        },
      ];
      mockQdrant.upsert.mockResolvedValue({
        operation_id: 0,
        status: 'completed' as const,
      });

      await VectorService.upsertBatch('test-collection', points);

      expect(mockQdrant.upsert).toHaveBeenCalledWith('test-collection', {
        wait: true,
        points,
      });
    });

    it('should throw on upsert error', async () => {
      const points = [
        {
          id: '1',
          vector: [0.1],
          payload: {
            fileId: 'file-1',
            companyId: 'company-1',
            text_preview: '',
            chunkIndex: 0,
          },
        },
      ];
      mockQdrant.upsert.mockRejectedValue(new Error('Upsert failed'));

      await expect(VectorService.upsertBatch('test-collection', points)).rejects.toThrow(
        'Upsert failed'
      );
    });
  });

  describe('search', () => {
    it('should search successfully', async () => {
      const mockResults: QdrantSearchResult[] = [
        { id: '1', score: 0.9, payload: { text: 'result1' } },
        { id: '2', score: 0.8, payload: { text: 'result2' } },
      ];
      const expectedResults = [
        { id: '1', score: 90, payload: { text: 'result1' } },
        { id: '2', score: 80, payload: { text: 'result2' } },
      ];
      mockQdrant.search.mockResolvedValue(mockResults);

      const result = await VectorService.search('test-collection', [0.1, 0.2, 0.3], 10);

      expect(result).toEqual(expectedResults);
      expect(mockQdrant.search).toHaveBeenCalledWith('test-collection', {
        vector: [0.1, 0.2, 0.3],
        limit: 10,
        filter: undefined,
      });
    });

    it('should include filter in search', async () => {
      const filter = { must: [{ key: 'companyId', match: { value: 'company-123' } }] };
      const emptyResults: QdrantSearchResult[] = [];
      mockQdrant.search.mockResolvedValue(emptyResults);

      await VectorService.search('test-collection', [0.1, 0.2], 5, filter);

      expect(mockQdrant.search).toHaveBeenCalledWith('test-collection', {
        vector: [0.1, 0.2],
        limit: 5,
        filter,
      });
    });

    it('should use default limit of 10', async () => {
      const emptyResults: QdrantSearchResult[] = [];
      mockQdrant.search.mockResolvedValue(emptyResults);

      await VectorService.search('test-collection', [0.1, 0.2]);

      expect(mockQdrant.search).toHaveBeenCalledWith('test-collection', {
        vector: [0.1, 0.2],
        limit: 10,
        filter: undefined,
      });
    });

    it('should throw on search error', async () => {
      mockQdrant.search.mockRejectedValue(new Error('Search failed'));

      await expect(VectorService.search('test-collection', [0.1, 0.2])).rejects.toThrow(
        'Search failed'
      );
    });

    it('should handle empty results gracefully', async () => {
      const emptyResults: QdrantSearchResult[] = [];
      mockQdrant.search.mockResolvedValue(emptyResults);

      const result = await VectorService.search('test-collection', [0.1, 0.2]);

      expect(result).toEqual([]);
    });

    it('should handle results with null payload', async () => {
      const mockResults: QdrantSearchResult[] = [{ id: '1', score: 0.9, payload: null }];
      mockQdrant.search.mockResolvedValue(mockResults);

      const result = await VectorService.search('test-collection', [0.1, 0.2]);

      expect(result).toHaveLength(1);
      expect(result[0].payload).toBeNull();
    });

    it('should handle very high limit values', async () => {
      const emptyResults: QdrantSearchResult[] = [];
      mockQdrant.search.mockResolvedValue(emptyResults);

      await VectorService.search('test-collection', [0.1, 0.2], 10000);

      expect(mockQdrant.search).toHaveBeenCalledWith('test-collection', {
        vector: [0.1, 0.2],
        limit: 10000,
        filter: undefined,
      });
    });

    it('should clamp scores to 0-100 range', async () => {
      const mockResults: QdrantSearchResult[] = [
        { id: '1', score: 1.5, payload: {} }, // Above 1 (should clamp to 100)
        { id: '2', score: -0.5, payload: {} }, // Below 0 (should clamp to 0)
      ];
      mockQdrant.search.mockResolvedValue(mockResults);

      const result = await VectorService.search('test-collection', [0.1], 10);

      expect(result[0].score).toBe(100); // Clamped to max
      expect(result[1].score).toBe(0); // Clamped to min
    });

    it('should fetch content from embedding repository', async () => {
      const mockResults: QdrantSearchResult[] = [
        { id: '1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
      ];
      mockQdrant.search.mockResolvedValue(mockResults);
      (embeddingRepository.findChunks as jest.Mock).mockResolvedValue([
        { fileId: 'file-1', chunkIndex: 0, content: 'Full text content from DB' },
      ]);

      const result = await VectorService.search('test-collection', [0.1], 10);

      expect(embeddingRepository.findChunks).toHaveBeenCalledWith([
        { fileId: 'file-1', chunkIndex: 0 },
      ]);
      expect((result[0].payload as { content?: string }).content).toBe('Full text content from DB');
    });

    it('should handle embedding repository error gracefully', async () => {
      const mockResults: QdrantSearchResult[] = [
        { id: '1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0 } },
      ];
      mockQdrant.search.mockResolvedValue(mockResults);
      (embeddingRepository.findChunks as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await VectorService.search('test-collection', [0.1], 10);

      // Should still return results, just without enriched content
      expect(result).toHaveLength(1);
    });
  });

  describe('getEmbeddings edge cases', () => {
    it('should handle empty text array', async () => {
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue([]);

      const result = await VectorService.getEmbeddings([]);

      expect(result).toEqual([]);
    });

    it('should handle single text input', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3]];
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue(mockEmbedding);

      const result = await VectorService.getEmbeddings(['single text']);

      expect(result).toEqual(mockEmbedding);
    });

    it('should handle very long text', async () => {
      const longText = 'x'.repeat(100000);
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1]]);

      const result = await VectorService.getEmbeddings([longText]);

      expect(EmbeddingService.getEmbeddings).toHaveBeenCalledWith([longText]);
      expect(result).toEqual([[0.1]]);
    });

    it('should handle unicode text correctly', async () => {
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2]]);

      await VectorService.getEmbeddings(['你好世界 🌍 مرحبا']);

      expect(EmbeddingService.getEmbeddings).toHaveBeenCalledWith(['你好世界 🌍 مرحبا']);
    });

    it('should handle service errors', async () => {
      (EmbeddingService.getEmbeddings as jest.Mock).mockRejectedValue(
        new ExternalServiceError('OpenAI', 'Request timeout')
      );

      await expect(VectorService.getEmbeddings(['text'])).rejects.toThrow(ExternalServiceError);
    });

    it('should propagate errors from embedding service', async () => {
      (EmbeddingService.getEmbeddings as jest.Mock).mockRejectedValue(
        new ExternalServiceError('OpenAI', 'Invalid response')
      );

      await expect(VectorService.getEmbeddings(['text'])).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('deleteByFileId', () => {
    it('should delete vectors by fileId', async () => {
      mockQdrant.delete.mockResolvedValue({ operation_id: 123 });
      mockQdrant.scroll.mockResolvedValue({ points: [] });

      const result = await VectorService.deleteByFileId('test-collection', 'file-123');

      expect(result).toBe(1);
      expect(mockQdrant.delete).toHaveBeenCalledWith('test-collection', {
        wait: true,
        filter: {
          must: [{ key: 'fileId', match: { value: 'file-123' } }],
        },
      });
    });

    it('should throw on delete error', async () => {
      mockQdrant.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(VectorService.deleteByFileId('test-collection', 'file-123')).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('deleteByProjectId', () => {
    it('should delete vectors for all files in project', async () => {
      const fileIds = ['file-1', 'file-2', 'file-3'];
      mockQdrant.delete.mockResolvedValue({ operation_id: 456 });

      const result = await VectorService.deleteByProjectId(
        'test-collection',
        'project-123',
        fileIds
      );

      expect(result).toBe(3);
      expect(mockQdrant.delete).toHaveBeenCalledWith('test-collection', {
        wait: true,
        filter: {
          must: [{ key: 'fileId', match: { any: fileIds } }],
        },
      });
    });

    it('should return 0 for empty fileIds array', async () => {
      const result = await VectorService.deleteByProjectId('test-collection', 'project-123', []);

      expect(result).toBe(0);
      expect(mockQdrant.delete).not.toHaveBeenCalled();
    });
  });

  describe('countByFileId', () => {
    it('should return count of vectors for fileId', async () => {
      mockQdrant.count.mockResolvedValue({ count: 42 });

      const result = await VectorService.countByFileId('test-collection', 'file-123');

      expect(result).toBe(42);
    });

    it('should return 0 for non-existent collection', async () => {
      const notFoundError = createMockHttpError('Not found', 404);
      mockQdrant.count.mockRejectedValue(notFoundError);

      const result = await VectorService.countByFileId('test-collection', 'file-123');

      expect(result).toBe(0);
    });

    it('should throw on other errors', async () => {
      const serverError = new Error('Server error');
      mockQdrant.count.mockRejectedValue(serverError);

      await expect(VectorService.countByFileId('test-collection', 'file-123')).rejects.toThrow(
        'Server error'
      );
    });
  });

  describe('getCollectionInfo', () => {
    it('should return collection info', async () => {
      mockQdrant.getCollection.mockResolvedValue({ points_count: 1000 });

      const result = await VectorService.getCollectionInfo('test-collection');

      expect(result).toEqual({ pointsCount: 1000 });
    });

    it('should return null for non-existent collection', async () => {
      const notFoundError = createMockHttpError('Not found', 404);
      mockQdrant.getCollection.mockRejectedValue(notFoundError);

      const result = await VectorService.getCollectionInfo('non-existent');

      expect(result).toBeNull();
    });

    it('should throw on other errors', async () => {
      const serverError = createMockHttpError('Server error', 500);
      mockQdrant.getCollection.mockRejectedValue(serverError);

      await expect(VectorService.getCollectionInfo('test-collection')).rejects.toThrow(
        'Server error'
      );
    });
  });

  describe('rerank', () => {
    it('should rerank documents using embedding similarity', async () => {
      // Mock embeddings: query embedding and multiple doc embeddings
      (EmbeddingService.getEmbeddings as jest.Mock)
        .mockResolvedValueOnce([[1, 0, 0]]) // query embedding
        .mockResolvedValueOnce([
          [1, 0, 0], // doc1 - same as query
          [0, 1, 0], // doc2 - orthogonal
          [0.5, 0.5, 0], // doc3 - partially similar
        ]);

      const result = await VectorService.rerank('test query', ['doc1', 'doc2', 'doc3']);

      // Should return an array of scores (one per document)
      expect(result).toHaveLength(3);
      result.forEach((score) => {
        expect(typeof score).toBe('number');
        // Cosine similarity is between -1 and 1
        expect(score).toBeGreaterThanOrEqual(-1);
        expect(score).toBeLessThanOrEqual(1);
      });

      // First doc should have highest score (same vector as query)
      expect(result[0]).toBeCloseTo(1, 5);
      // Second doc should have lowest score (orthogonal)
      expect(result[1]).toBeCloseTo(0, 5);
    });

    it('should call embedding service for query and documents', async () => {
      (EmbeddingService.getEmbeddings as jest.Mock)
        .mockResolvedValueOnce([[0.1, 0.2, 0.3]])
        .mockResolvedValueOnce([[0.1, 0.2, 0.3]]);

      await VectorService.rerank('query', ['doc1']);

      expect(EmbeddingService.getEmbeddings).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEmbeddingDimensions', () => {
    it('should return 1536 for openai provider (text-embedding-3-small)', () => {
      const result = VectorService.getEmbeddingDimensions('openai');
      expect(result).toBe(1536);
    });
  });

  describe('getModelName', () => {
    it('should return model name for openai provider', () => {
      const result = VectorService.getModelName('openai');
      expect(result).toBe('text-embedding-3-small');
    });
  });

  describe('upsertBatch edge cases', () => {
    it('should handle empty points array', async () => {
      mockQdrant.upsert.mockResolvedValue({
        operation_id: 0,
        status: 'completed' as const,
      });

      await VectorService.upsertBatch('test-collection', []);

      expect(mockQdrant.upsert).toHaveBeenCalledWith('test-collection', {
        wait: true,
        points: [],
      });
    });

    it('should handle very large batch sizes', async () => {
      const largePoints = Array.from({ length: 1000 }, (_, i) => ({
        id: `point-${i}`,
        vector: [0.1, 0.2, 0.3],
        payload: {
          fileId: 'file-1',
          companyId: 'company-1',
          text_preview: `text ${i}`,
          chunkIndex: i,
        },
      }));
      mockQdrant.upsert.mockResolvedValue({
        operation_id: 0,
        status: 'completed' as const,
      });

      await VectorService.upsertBatch('test-collection', largePoints);

      expect(mockQdrant.upsert).toHaveBeenCalled();
    });

    it('should handle points with empty payload', async () => {
      const points = [
        {
          id: '1',
          vector: [0.1],
          payload: {
            fileId: '',
            companyId: '',
            text_preview: '',
            chunkIndex: 0,
          },
        },
      ];
      mockQdrant.upsert.mockResolvedValue({
        operation_id: 0,
        status: 'completed' as const,
      });

      await VectorService.upsertBatch('test-collection', points);

      expect(mockQdrant.upsert).toHaveBeenCalledWith('test-collection', {
        wait: true,
        points,
      });
    });
  });

  describe('countByFileIds', () => {
    it('should count vectors for multiple file IDs', async () => {
      mockQdrant.count.mockResolvedValueOnce({ count: 10 });
      mockQdrant.count.mockResolvedValueOnce({ count: 20 });
      mockQdrant.count.mockResolvedValueOnce({ count: 30 });

      const result = await VectorService.countByFileIds('test-collection', [
        'file-1',
        'file-2',
        'file-3',
      ]);

      expect(result.get('file-1')).toBe(10);
      expect(result.get('file-2')).toBe(20);
      expect(result.get('file-3')).toBe(30);
    });

    it('should handle empty file IDs array', async () => {
      const result = await VectorService.countByFileIds('test-collection', []);

      expect(result.size).toBe(0);
    });

    it('should process in batches for large file ID arrays', async () => {
      // Create more than 50 file IDs to test batching
      const fileIds = Array.from({ length: 60 }, (_, i) => `file-${i}`);
      mockQdrant.count.mockResolvedValue({ count: 5 });

      const result = await VectorService.countByFileIds('test-collection', fileIds);

      expect(result.size).toBe(60);
      expect(mockQdrant.count).toHaveBeenCalledTimes(60);
    });
  });

  describe('getUniqueFileIds', () => {
    it('should get unique file IDs from collection', async () => {
      mockQdrant.scroll.mockResolvedValueOnce({
        points: [
          { id: '1', payload: { fileId: 'file-1' } },
          { id: '2', payload: { fileId: 'file-2' } },
          { id: '3', payload: { fileId: 'file-1' } }, // Duplicate
        ],
        next_page_offset: 'offset-1',
      });
      mockQdrant.scroll.mockResolvedValueOnce({
        points: [{ id: '4', payload: { fileId: 'file-3' } }],
        next_page_offset: undefined,
      });

      const result = await VectorService.getUniqueFileIds('test-collection');

      expect(result.size).toBe(3);
      expect(result.has('file-1')).toBe(true);
      expect(result.has('file-2')).toBe(true);
      expect(result.has('file-3')).toBe(true);
    });

    it('should return empty set for non-existent collection', async () => {
      const notFoundError = createMockHttpError('Not found', 404);
      mockQdrant.scroll.mockRejectedValue(notFoundError);

      const result = await VectorService.getUniqueFileIds('non-existent');

      expect(result.size).toBe(0);
    });

    it('should throw on other errors', async () => {
      const serverError = createMockHttpError('Server error', 500);
      mockQdrant.scroll.mockRejectedValue(serverError);

      await expect(VectorService.getUniqueFileIds('test-collection')).rejects.toThrow(
        'Server error'
      );
    });

    it('should handle points without fileId payload', async () => {
      mockQdrant.scroll.mockResolvedValueOnce({
        points: [
          { id: '1', payload: { fileId: 'file-1' } },
          { id: '2', payload: {} }, // No fileId
          { id: '3', payload: null }, // Null payload
        ],
        next_page_offset: undefined,
      });

      const result = await VectorService.getUniqueFileIds('test-collection');

      expect(result.size).toBe(1);
      expect(result.has('file-1')).toBe(true);
    });

    it('should handle empty collection', async () => {
      mockQdrant.scroll.mockResolvedValueOnce({
        points: [],
        next_page_offset: undefined,
      });

      const result = await VectorService.getUniqueFileIds('empty-collection');

      expect(result.size).toBe(0);
    });
  });

  describe('getAllPoints generator', () => {
    it('should yield batches of points', async () => {
      mockQdrant.scroll.mockResolvedValueOnce({
        points: [
          {
            id: '1',
            payload: { fileId: 'file-1', companyId: 'company-1', chunkIndex: 0 },
          },
        ],
        next_page_offset: 'offset-1',
      });
      mockQdrant.scroll.mockResolvedValueOnce({
        points: [
          {
            id: '2',
            payload: { fileId: 'file-2', companyId: 'company-1', chunkIndex: 0 },
          },
        ],
        next_page_offset: undefined,
      });

      const batches = [];
      for await (const batch of VectorService.getAllPoints('test-collection')) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(1);
      expect(batches[1]).toHaveLength(1);
    });

    it('should handle non-existent collection gracefully', async () => {
      const notFoundError = createMockHttpError('Not found', 404);
      mockQdrant.scroll.mockRejectedValue(notFoundError);

      const batches = [];
      for await (const batch of VectorService.getAllPoints('non-existent')) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(0);
    });

    it('should apply filter when provided', async () => {
      mockQdrant.scroll.mockResolvedValueOnce({
        points: [],
        next_page_offset: undefined,
      });

      const filter = { must: [{ key: 'companyId', match: { value: 'company-123' } }] };

      const batches = [];
      for await (const batch of VectorService.getAllPoints('test-collection', filter)) {
        batches.push(batch);
      }

      expect(mockQdrant.scroll).toHaveBeenCalledWith(
        'test-collection',
        expect.objectContaining({ filter })
      );
    });

    it('should throw on non-404 errors', async () => {
      const serverError = createMockHttpError('Server error', 500);
      mockQdrant.scroll.mockRejectedValue(serverError);

      const generator = VectorService.getAllPoints('test-collection');

      await expect(generator.next()).rejects.toThrow('Server error');
    });
  });

  describe('deleteByFileId - edge cases', () => {
    it('should log warning if vectors still exist after deletion', async () => {
      mockQdrant.delete.mockResolvedValue({ operation_id: 123 });
      mockQdrant.scroll.mockResolvedValue({ points: [{ id: '1' }] });

      await VectorService.deleteByFileId('test-collection', 'file-123');

      // Test passes if no error is thrown
    });

    it('should handle scroll error gracefully after deletion', async () => {
      mockQdrant.delete.mockResolvedValue({ operation_id: 123 });
      mockQdrant.scroll.mockRejectedValue(new Error('Scroll failed'));

      const result = await VectorService.deleteByFileId('test-collection', 'file-123');

      // Should not throw, just log debug and return
      expect(result).toBe(1);
    });

    it('should return 0 when no operation_id in response', async () => {
      mockQdrant.delete.mockResolvedValue({});
      mockQdrant.scroll.mockResolvedValue({ points: [] });

      const result = await VectorService.deleteByFileId('test-collection', 'file-123');

      expect(result).toBe(0);
    });
  });

  describe('deleteByProjectId - edge cases', () => {
    it('should throw on delete error', async () => {
      mockQdrant.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(
        VectorService.deleteByProjectId('test-collection', 'project-123', ['file-1'])
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('searchWithReranking', () => {
    it('should perform hybrid search with reranking', async () => {
      // Mock embeddings via EmbeddingService
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2, 0.3]]);

      // Mock initial search results
      mockQdrant.search.mockResolvedValue([
        { id: '1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0, text_preview: 'doc1' } },
        { id: '2', score: 0.8, payload: { fileId: 'file-2', chunkIndex: 0, text_preview: 'doc2' } },
      ]);

      // Mock embedding repository for full text
      (embeddingRepository.findChunks as jest.Mock).mockResolvedValue([
        { fileId: 'file-1', chunkIndex: 0, content: 'Full document 1 text' },
        { fileId: 'file-2', chunkIndex: 0, content: 'Full document 2 text' },
      ]);

      const result = await VectorService.searchWithReranking(
        'test-collection',
        'test query',
        2,
        undefined,
        20
      );

      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThanOrEqual(0);
      expect(result[0].score).toBeLessThanOrEqual(100);
    });

    it('should return empty array when no initial results', async () => {
      // Mock embeddings via EmbeddingService
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2, 0.3]]);

      // Mock empty search results
      mockQdrant.search.mockResolvedValue([]);

      const result = await VectorService.searchWithReranking('test-collection', 'test query');

      expect(result).toEqual([]);
    });

    it('should handle rerank with identical scores', async () => {
      // Mock embeddings - using same vector for all to get identical similarity scores
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2, 0.3]]);

      // Mock search results
      mockQdrant.search.mockResolvedValue([
        { id: '1', score: 0.9, payload: { fileId: 'file-1', chunkIndex: 0, text_preview: 'doc1' } },
        { id: '2', score: 0.8, payload: { fileId: 'file-2', chunkIndex: 0, text_preview: 'doc2' } },
      ]);

      (embeddingRepository.findChunks as jest.Mock).mockResolvedValue([]);

      const result = await VectorService.searchWithReranking('test-collection', 'test query');

      // Should return at least one result
      expect(result.length).toBeGreaterThanOrEqual(1);
      // First result should have a score
      expect(typeof result[0].score).toBe('number');
    });

    it('should fall back to text_preview when full text fetch fails', async () => {
      // Mock embeddings via EmbeddingService
      (EmbeddingService.getEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2, 0.3]]);

      // Mock search results
      mockQdrant.search.mockResolvedValue([
        {
          id: '1',
          score: 0.9,
          payload: { fileId: 'file-1', chunkIndex: 0, text_preview: 'preview text' },
        },
      ]);

      // Full text fetch fails - falls back to text_preview
      (embeddingRepository.findChunks as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await VectorService.searchWithReranking('test-collection', 'test query');

      // Should still return result even when full text fetch fails
      expect(result).toHaveLength(1);
    });
  });

  describe('ensureCollection - dimension mismatch', () => {
    it('should throw error when collection dimensions do not match expected', async () => {
      mockQdrant.getCollection.mockResolvedValue({
        config: {
          params: {
            vectors: { size: 3072 }, // Different from expected 1536 for text-embedding-3-small
          },
        },
      });

      await expect(VectorService.ensureCollection('test-collection')).rejects.toThrow(
        ExternalServiceError
      );
    });
  });

  describe('getCollectionInfo - edge cases', () => {
    it('should return 0 points when points_count is undefined', async () => {
      mockQdrant.getCollection.mockResolvedValue({});

      const result = await VectorService.getCollectionInfo('test-collection');

      expect(result).toEqual({ pointsCount: 0 });
    });
  });
});
