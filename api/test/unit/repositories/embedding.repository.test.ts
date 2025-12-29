import { embeddingRepository } from '../../../src/repositories/embedding.repository';
import { EmbeddingModel } from '../../../src/models/embedding.model';
import { Types } from 'mongoose';

// Mock Mongoose model
jest.mock('../../../src/models/embedding.model');

describe('EmbeddingRepository', () => {
  const mockFileId = new Types.ObjectId().toString();
  const mockProjectId = new Types.ObjectId().toString();

  const mockEmbedding = {
    _id: new Types.ObjectId(),
    fileId: new Types.ObjectId(mockFileId),
    projectId: new Types.ObjectId(mockProjectId),
    contents: ['chunk 1 content', 'chunk 2 content', 'chunk 3 content'],
    chunkCount: 3,
    createdAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new embedding', async () => {
      const mockData = {
        fileId: mockFileId,
        projectId: mockProjectId,
        contents: ['content 1', 'content 2'],
        chunkCount: 2,
        vectors: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        provider: 'openai' as const,
        modelName: 'text-embedding-3-small',
        vectorDimensions: 1536,
      };

      const mockSavedEmbedding = {
        ...mockData,
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId(),
          ...mockData,
        }),
      };

      (EmbeddingModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedEmbedding),
      }));

      const result = await embeddingRepository.create(mockData);

      expect(result).toHaveProperty('fileId');
      expect(EmbeddingModel).toHaveBeenCalledWith(mockData);
    });
  });

  describe('findByFileId', () => {
    it('should return embedding if found', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockEmbedding),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findByFileId(mockFileId);

      expect(result).toBeDefined();
      expect(EmbeddingModel.findOne).toHaveBeenCalledWith({
        fileId: mockFileId,
        deletedAt: null,
      });
    });

    it('should return null if not found', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findByFileId('non-existent');

      expect(result).toBeNull();
    });

    it('should exclude soft-deleted embeddings', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      await embeddingRepository.findByFileId(mockFileId);

      expect(EmbeddingModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null })
      );
    });
  });

  describe('findByProjectId', () => {
    it('should return embeddings for project', async () => {
      const mockEmbeddings = [mockEmbedding, { ...mockEmbedding, _id: new Types.ObjectId() }];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEmbeddings),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findByProjectId(mockProjectId);

      expect(result).toHaveLength(2);
      expect(EmbeddingModel.find).toHaveBeenCalledWith({
        projectId: mockProjectId,
        deletedAt: null,
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should return empty array if no embeddings found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findByProjectId(mockProjectId);

      expect(result).toEqual([]);
    });
  });

  describe('findByProjectIds', () => {
    it('should return paginated embeddings for multiple projects', async () => {
      const mockEmbeddings = [mockEmbedding];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEmbeddings),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);
      (EmbeddingModel.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await embeddingRepository.findByProjectIds([mockProjectId], 1, 10);

      expect(result).toEqual({
        embeddings: expect.any(Array),
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);
      (EmbeddingModel.countDocuments as jest.Mock).mockResolvedValue(25);

      const result = await embeddingRepository.findByProjectIds([mockProjectId], 2, 10);

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should use default pagination values', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);
      (EmbeddingModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await embeddingRepository.findByProjectIds([mockProjectId]);

      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findChunks', () => {
    it('should return chunks for requested file/index pairs', async () => {
      const mockEmbeddings = [
        {
          fileId: new Types.ObjectId(mockFileId),
          contents: ['chunk 0', 'chunk 1', 'chunk 2'],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEmbeddings),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunks([
        { fileId: mockFileId, chunkIndex: 0 },
        { fileId: mockFileId, chunkIndex: 2 },
      ]);

      expect(result).toEqual([
        { fileId: mockFileId, chunkIndex: 0, content: 'chunk 0' },
        { fileId: mockFileId, chunkIndex: 2, content: 'chunk 2' },
      ]);
    });

    it('should return empty array for empty input', async () => {
      const result = await embeddingRepository.findChunks([]);

      expect(result).toEqual([]);
      expect(EmbeddingModel.find).not.toHaveBeenCalled();
    });

    it('should skip missing chunks', async () => {
      const mockEmbeddings = [
        {
          fileId: new Types.ObjectId(mockFileId),
          contents: ['chunk 0', 'chunk 1'],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEmbeddings),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunks([
        { fileId: mockFileId, chunkIndex: 0 },
        { fileId: mockFileId, chunkIndex: 5 }, // Out of bounds
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].chunkIndex).toBe(0);
    });

    it('should deduplicate file IDs in query', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);

      await embeddingRepository.findChunks([
        { fileId: mockFileId, chunkIndex: 0 },
        { fileId: mockFileId, chunkIndex: 1 },
        { fileId: mockFileId, chunkIndex: 2 },
      ]);

      // Should only query for one fileId
      expect(EmbeddingModel.find).toHaveBeenCalledWith({
        fileId: { $in: [mockFileId] },
        deletedAt: null,
      });
    });
  });

  describe('deleteByFileId', () => {
    it('should soft delete embeddings by file ID', async () => {
      (EmbeddingModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await embeddingRepository.deleteByFileId(mockFileId);

      expect(result).toBe(1);
      expect(EmbeddingModel.updateMany).toHaveBeenCalledWith(
        { fileId: mockFileId, deletedAt: null },
        { $set: { deletedAt: expect.any(Date) } }
      );
    });

    it('should return 0 if no embeddings found', async () => {
      (EmbeddingModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const result = await embeddingRepository.deleteByFileId('non-existent');

      expect(result).toBe(0);
    });
  });

  describe('findAllChunksByFileId', () => {
    it('should return all chunks for a file sorted by index', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          contents: ['chunk 0 content', 'chunk 1 content', 'chunk 2 content'],
        }),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findAllChunksByFileId(mockFileId);

      expect(result).toEqual([
        { chunkIndex: 0, content: 'chunk 0 content' },
        { chunkIndex: 1, content: 'chunk 1 content' },
        { chunkIndex: 2, content: 'chunk 2 content' },
      ]);
      expect(EmbeddingModel.findOne).toHaveBeenCalledWith({
        fileId: mockFileId,
        deletedAt: null,
      });
    });

    it('should return null if file not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findAllChunksByFileId('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if contents is empty', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ contents: null }),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findAllChunksByFileId(mockFileId);

      expect(result).toBeNull();
    });
  });

  describe('findChunkRange', () => {
    it('should return chunks within the specified range', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          contents: ['chunk 0', 'chunk 1', 'chunk 2', 'chunk 3', 'chunk 4'],
          chunkCount: 5,
        }),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunkRange(mockFileId, 1, 3);

      expect(result).toEqual([
        { chunkIndex: 1, content: 'chunk 1' },
        { chunkIndex: 2, content: 'chunk 2' },
        { chunkIndex: 3, content: 'chunk 3' },
      ]);
    });

    it('should clamp startIndex to 0 if negative', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          contents: ['chunk 0', 'chunk 1', 'chunk 2'],
          chunkCount: 3,
        }),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunkRange(mockFileId, -2, 1);

      expect(result).toEqual([
        { chunkIndex: 0, content: 'chunk 0' },
        { chunkIndex: 1, content: 'chunk 1' },
      ]);
    });

    it('should clamp endIndex to last chunk if out of bounds', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          contents: ['chunk 0', 'chunk 1', 'chunk 2'],
          chunkCount: 3,
        }),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunkRange(mockFileId, 1, 10);

      expect(result).toEqual([
        { chunkIndex: 1, content: 'chunk 1' },
        { chunkIndex: 2, content: 'chunk 2' },
      ]);
    });

    it('should return null if file not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunkRange('non-existent', 0, 2);

      expect(result).toBeNull();
    });

    it('should return empty array if range has no content', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          contents: [],
          chunkCount: 0,
        }),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunkRange(mockFileId, 0, 2);

      expect(result).toEqual([]);
    });
  });

  describe('getChunkCount', () => {
    it('should return chunk count for a file', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ chunkCount: 5 }),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.getChunkCount(mockFileId);

      expect(result).toBe(5);
      expect(EmbeddingModel.findOne).toHaveBeenCalledWith({
        fileId: mockFileId,
        deletedAt: null,
      });
    });

    it('should return null if file not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.getChunkCount('non-existent');

      expect(result).toBeNull();
    });
  });
});
