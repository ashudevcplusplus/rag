import { VectorService } from '../../../src/services/vector.service';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ExternalServiceError } from '../../../src/types/error.types';

// Mock dependencies
jest.mock('@qdrant/js-client-rest');
jest.mock('../../../src/config', () => ({
  CONFIG: {
    QDRANT_URL: 'http://localhost:6333',
    EMBED_URL: 'http://localhost:5001/embed',
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

describe('VectorService', () => {
  let mockQdrant: jest.Mocked<QdrantClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQdrant = {
      getCollection: jest.fn(),
      createCollection: jest.fn(),
      createPayloadIndex: jest.fn(),
      upsert: jest.fn(),
      search: jest.fn(),
    } as any;

    (QdrantClient as jest.MockedClass<typeof QdrantClient>).mockImplementation(() => mockQdrant);
  });

  describe('getEmbeddings', () => {
    it('should fetch embeddings successfully', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ embeddings: mockEmbeddings }),
      });

      const result = await VectorService.getEmbeddings(['text1', 'text2']);

      expect(result).toEqual(mockEmbeddings);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5001/embed',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: ['text1', 'text2'] }),
        })
      );
    });

    it('should handle vectors field name', async () => {
      const mockVectors = [[0.1, 0.2, 0.3]];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ vectors: mockVectors }),
      });

      const result = await VectorService.getEmbeddings(['text1']);

      expect(result).toEqual(mockVectors);
    });

    it('should throw ExternalServiceError on HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Service Unavailable',
      });

      await expect(VectorService.getEmbeddings(['text1'])).rejects.toThrow(ExternalServiceError);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(VectorService.getEmbeddings(['text1'])).rejects.toThrow('Network error');
    });
  });

  describe('ensureCollection', () => {
    it('should do nothing if collection exists', async () => {
      mockQdrant.getCollection.mockResolvedValue({} as any);

      await VectorService.ensureCollection('test-collection');

      expect(mockQdrant.getCollection).toHaveBeenCalledWith('test-collection');
      expect(mockQdrant.createCollection).not.toHaveBeenCalled();
    });

    it('should create collection if it does not exist', async () => {
      const error = new Error('Not found') as any;
      error.status = 404;
      mockQdrant.getCollection.mockRejectedValue(error);
      mockQdrant.createCollection.mockResolvedValue(undefined);
      mockQdrant.createPayloadIndex.mockResolvedValue(undefined);

      await VectorService.ensureCollection('test-collection');

      expect(mockQdrant.createCollection).toHaveBeenCalledWith('test-collection', {
        vectors: {
          size: 384,
          distance: 'Cosine',
        },
      });
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledTimes(2);
    });

    it('should create payload indexes for fileId and companyId', async () => {
      const error = new Error('Not found') as any;
      error.status = 404;
      mockQdrant.getCollection.mockRejectedValue(error);
      mockQdrant.createCollection.mockResolvedValue(undefined);
      mockQdrant.createPayloadIndex.mockResolvedValue(undefined);

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
      const error = new Error('Not found') as any;
      error.status = 404;
      mockQdrant.getCollection.mockRejectedValue(error);
      mockQdrant.createCollection.mockResolvedValue(undefined);
      mockQdrant.createPayloadIndex.mockRejectedValue(new Error('Index error'));

      await expect(VectorService.ensureCollection('test-collection')).resolves.not.toThrow();
    });

    it('should throw on non-404 errors', async () => {
      const error = new Error('Server error') as any;
      error.status = 500;
      mockQdrant.getCollection.mockRejectedValue(error);

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
      mockQdrant.upsert.mockResolvedValue(undefined);

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
      const mockResults = [
        { id: '1', score: 0.9, payload: { text: 'result1' } },
        { id: '2', score: 0.8, payload: { text: 'result2' } },
      ];
      mockQdrant.search.mockResolvedValue(mockResults as any);

      const result = await VectorService.search('test-collection', [0.1, 0.2, 0.3], 10);

      expect(result).toEqual(mockResults);
      expect(mockQdrant.search).toHaveBeenCalledWith('test-collection', {
        vector: [0.1, 0.2, 0.3],
        limit: 10,
        filter: undefined,
      });
    });

    it('should include filter in search', async () => {
      const filter = { must: [{ key: 'companyId', match: { value: 'company-123' } }] };
      mockQdrant.search.mockResolvedValue([] as any);

      await VectorService.search('test-collection', [0.1, 0.2], 5, filter);

      expect(mockQdrant.search).toHaveBeenCalledWith('test-collection', {
        vector: [0.1, 0.2],
        limit: 5,
        filter,
      });
    });

    it('should use default limit of 10', async () => {
      mockQdrant.search.mockResolvedValue([] as any);

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
  });
});
