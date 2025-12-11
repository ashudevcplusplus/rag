import { embeddingRepository } from '../../../src/repositories/embedding.repository';
import { EmbeddingModel } from '../../../src/models/embedding.model';
import { Types } from 'mongoose';

// Mock Mongoose model
jest.mock('../../../src/models/embedding.model');

describe('EmbeddingRepository', () => {
  const mockEmbeddingId = new Types.ObjectId().toString();
  const mockFileId = new Types.ObjectId().toString();
  const mockProjectId = new Types.ObjectId().toString();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an embedding successfully', async () => {
      const mockData = {
        fileId: mockFileId,
        projectId: mockProjectId,
        chunkCount: 10,
        contents: ['chunk 1', 'chunk 2'],
        vectors: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        provider: 'inhouse' as const,
        modelName: 'all-MiniLM-L6-v2',
        vectorDimensions: 384,
      };

      const mockSavedEmbedding = {
        _id: new Types.ObjectId(mockEmbeddingId),
        ...mockData,
        createdAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId(mockEmbeddingId),
          ...mockData,
          createdAt: new Date(),
        }),
      };

      (EmbeddingModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedEmbedding),
      }));

      const result = await embeddingRepository.create(mockData);

      expect(result).toHaveProperty('_id');
      expect(result.fileId).toBe(mockFileId);
      expect(EmbeddingModel).toHaveBeenCalledWith(mockData);
    });

    it('should handle save errors', async () => {
      const mockData = {
        fileId: mockFileId,
        projectId: mockProjectId,
        chunkCount: 5,
        contents: ['content'],
        vectors: [[0.1, 0.2]],
        provider: 'inhouse' as const,
        modelName: 'all-MiniLM-L6-v2',
        vectorDimensions: 384,
      };

      (EmbeddingModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      await expect(embeddingRepository.create(mockData)).rejects.toThrow('Database error');
    });
  });

  describe('findByFileId', () => {
    it('should return embedding when found', async () => {
      const mockEmbedding = {
        _id: new Types.ObjectId(mockEmbeddingId),
        fileId: mockFileId,
        projectId: mockProjectId,
        chunkCount: 5,
        contents: ['content 1', 'content 2'],
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockEmbedding),
      };

      (EmbeddingModel.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findByFileId(mockFileId);

      expect(result).toBeTruthy();
      expect(result?._id).toBe(mockEmbeddingId);
      expect(EmbeddingModel.findOne).toHaveBeenCalledWith({
        fileId: mockFileId,
        deletedAt: null,
      });
    });

    it('should return null when not found', async () => {
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

      expect(EmbeddingModel.findOne).toHaveBeenCalledWith({
        fileId: mockFileId,
        deletedAt: null,
      });
    });
  });

  describe('findByProjectId', () => {
    it('should return embeddings for project', async () => {
      const mockEmbeddings = [
        { _id: new Types.ObjectId(), fileId: 'file-1', projectId: mockProjectId },
        { _id: new Types.ObjectId(), fileId: 'file-2', projectId: mockProjectId },
      ];

      const mockQuery = {
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

    it('should return empty array when no embeddings found', async () => {
      const mockQuery = {
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
      const projectIds = ['project-1', 'project-2'];
      const mockEmbeddings = [
        { _id: new Types.ObjectId(), fileId: 'file-1', projectId: 'project-1' },
        { _id: new Types.ObjectId(), fileId: 'file-2', projectId: 'project-2' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEmbeddings),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);
      (EmbeddingModel.countDocuments as jest.Mock).mockResolvedValue(50);

      const result = await embeddingRepository.findByProjectIds(projectIds, 1, 20);

      expect(result.embeddings).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3);
      expect(EmbeddingModel.find).toHaveBeenCalledWith({
        projectId: { $in: projectIds },
        deletedAt: null,
      });
    });

    it('should handle pagination correctly', async () => {
      const projectIds = ['project-1'];
      const mockEmbeddings = [{ _id: new Types.ObjectId(), fileId: 'file-1' }];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEmbeddings),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);
      (EmbeddingModel.countDocuments as jest.Mock).mockResolvedValue(100);

      const result = await embeddingRepository.findByProjectIds(projectIds, 3, 25);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(4);
      expect(mockQuery.skip).toHaveBeenCalledWith(50); // (3-1) * 25
      expect(mockQuery.limit).toHaveBeenCalledWith(25);
    });

    it('should use default pagination values', async () => {
      const projectIds = ['project-1'];

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

      await embeddingRepository.findByProjectIds(projectIds);

      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findChunks', () => {
    it('should return specific chunks by fileId and chunkIndex', async () => {
      const chunks = [
        { fileId: 'file-1', chunkIndex: 0 },
        { fileId: 'file-1', chunkIndex: 2 },
        { fileId: 'file-2', chunkIndex: 1 },
      ];

      // Mock with proper fileId conversion
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            fileId: { toString: () => 'file-1' },
            contents: ['Content 0', 'Content 1', 'Content 2', 'Content 3'],
          },
          {
            fileId: { toString: () => 'file-2' },
            contents: ['File 2 Content 0', 'File 2 Content 1'],
          },
        ]),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunks(chunks);

      expect(EmbeddingModel.find).toHaveBeenCalledWith({
        fileId: { $in: ['file-1', 'file-2'] },
        deletedAt: null,
      });
    });

    it('should return empty array for empty chunks input', async () => {
      const result = await embeddingRepository.findChunks([]);

      expect(result).toEqual([]);
      expect(EmbeddingModel.find).not.toHaveBeenCalled();
    });

    it('should handle missing chunks gracefully', async () => {
      const chunks = [
        { fileId: 'file-1', chunkIndex: 100 }, // Index out of bounds
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            fileId: { toString: () => 'file-1' },
            contents: ['Only one chunk'], // Only has index 0
          },
        ]),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await embeddingRepository.findChunks(chunks);

      expect(result).toEqual([]);
    });

    it('should deduplicate fileIds in query', async () => {
      const chunks = [
        { fileId: 'file-1', chunkIndex: 0 },
        { fileId: 'file-1', chunkIndex: 1 },
        { fileId: 'file-1', chunkIndex: 2 },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (EmbeddingModel.find as jest.Mock).mockReturnValue(mockQuery);

      await embeddingRepository.findChunks(chunks);

      // Should only query for 'file-1' once (deduplication)
      expect(EmbeddingModel.find).toHaveBeenCalledWith({
        fileId: { $in: ['file-1'] },
        deletedAt: null,
      });
    });
  });

  describe('deleteByFileId', () => {
    it('should soft delete embeddings by fileId', async () => {
      (EmbeddingModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

      const result = await embeddingRepository.deleteByFileId(mockFileId);

      expect(result).toBe(2);
      expect(EmbeddingModel.updateMany).toHaveBeenCalledWith(
        { fileId: mockFileId, deletedAt: null },
        { $set: { deletedAt: expect.any(Date) } }
      );
    });

    it('should return 0 when no embeddings to delete', async () => {
      (EmbeddingModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const result = await embeddingRepository.deleteByFileId('non-existent');

      expect(result).toBe(0);
    });

    it('should not affect already deleted embeddings', async () => {
      (EmbeddingModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      await embeddingRepository.deleteByFileId(mockFileId);

      expect(EmbeddingModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
        expect.any(Object)
      );
    });
  });
});
