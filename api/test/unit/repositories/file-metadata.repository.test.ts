import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { FileMetadataModel } from '../../../src/models/file-metadata.model';
import { projectRepository } from '../../../src/repositories/project.repository';
import { ProcessingStatus, UploadStatus } from '@rag/types';
import { Types } from 'mongoose';

// Mock Mongoose model and Types
jest.mock('../../../src/models/file-metadata.model');
jest.mock('../../../src/repositories/project.repository', () => ({
  projectRepository: {
    updateStats: jest.fn(),
    findById: jest.fn().mockResolvedValue({
      _id: 'project-123',
      companyId: 'company-123',
    }),
  },
}));
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  Types: {
    ObjectId: jest.fn(),
  },
}));
jest.mock('../../../src/repositories/helpers', () => ({
  toStringId: jest.fn((doc: any) => ({ ...doc, _id: doc._id?.toString() || doc._id })),
  toStringIds: jest.fn((docs: any[]) =>
    docs.map((doc) => ({ ...doc, _id: doc._id?.toString() || doc._id }))
  ),
}));

jest.mock('../../../src/services/vector.service', () => ({
  VectorService: {
    deleteByFileId: jest.fn(),
  },
}));

jest.mock('../../../src/repositories/embedding.repository', () => ({
  embeddingRepository: {
    deleteByFileId: jest.fn(),
  },
}));

jest.mock('../../../src/services/cache.service', () => ({
  CacheService: {
    clearCompany: jest.fn(),
  },
}));

jest.mock('../../../src/services/consistency-check.service', () => ({
  ConsistencyCheckService: {
    publishConsistencyCheck: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('FileMetadataRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create file metadata', async () => {
      const mockData = {
        projectId: 'project-123',
        uploadedBy: 'user-123',
        filename: 'test.txt',
        originalFilename: 'test.txt',
        filepath: '/tmp/test.txt',
        mimetype: 'text/plain',
        size: 1024,
        hash: 'abc123',
        tags: [],
      };

      const mockSaved = {
        ...mockData,
        _id: { toString: () => 'file-123' },
        projectId: { toString: () => 'project-123' },
        uploadedBy: { toString: () => 'user-123' },
        processingStatus: ProcessingStatus.PENDING,
        uploadStatus: UploadStatus.UPLOADED,
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: 'file-123',
          processingStatus: ProcessingStatus.PENDING,
        }),
      };

      (FileMetadataModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSaved),
      }));

      const result = await fileMetadataRepository.create(mockData);

      expect(FileMetadataModel).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(
        expect.objectContaining({
          filename: mockData.filename,
        })
      );
    });
  });

  describe('findById', () => {
    it('should find file by ID', async () => {
      const mockFile = {
        _id: { toString: () => 'file-123' },
        filename: 'test.txt',
      };

      (FileMetadataModel.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });

      const result = await fileMetadataRepository.findById('file-123');

      expect(FileMetadataModel.findOne).toHaveBeenCalledWith({
        _id: 'file-123',
        deletedAt: null,
      });
      expect(result).toBeDefined();
    });

    it('should return null if file not found', async () => {
      (FileMetadataModel.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await fileMetadataRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateProcessingStatus', () => {
    it('should update status to PROCESSING', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateProcessingStatus('file-123', ProcessingStatus.PROCESSING);

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          processingStatus: ProcessingStatus.PROCESSING,
          processingStartedAt: expect.any(Date),
        },
      });
    });

    it('should update status to COMPLETED', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateProcessingStatus('file-123', ProcessingStatus.COMPLETED);

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          processingStatus: ProcessingStatus.COMPLETED,
          processingCompletedAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateVectorIndexed', () => {
    it('should update vector indexing status', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateVectorIndexed('file-123', true, 'collection-1', 50);

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          vectorIndexed: true,
          vectorIndexedAt: expect.any(Date),
          vectorCollection: 'collection-1',
          chunkCount: 50,
        },
      });
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count with error message', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.incrementRetryCount('file-123', 'Test error');

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $inc: { retryCount: 1 },
        $set: {
          lastRetryAt: expect.any(Date),
          errorMessage: 'Test error',
        },
      });
    });
  });

  describe('delete', () => {
    it('should soft delete file', async () => {
      (FileMetadataModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'file-123',
          projectId: 'project-123',
          size: 1024,
        }),
      });

      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'file-123',
      });

      const result = await fileMetadataRepository.delete('file-123');

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'file-123',
        { $set: { deletedAt: expect.any(Date) } },
        { new: true }
      );
      expect(result).toBe(true);
    });
  });

  describe('getTotalStorageByProject', () => {
    it('should calculate total storage', async () => {
      const mockObjectId = { toString: () => '507f1f77bcf86cd799439011' };
      (Types.ObjectId as unknown as jest.Mock) = jest.fn().mockReturnValue(mockObjectId) as any;

      (FileMetadataModel.aggregate as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{ _id: null, totalSize: 2048 }]);

      const result = await fileMetadataRepository.getTotalStorageByProject(
        '507f1f77bcf86cd799439011'
      );

      expect(FileMetadataModel.aggregate).toHaveBeenCalled();
      expect(result).toBe(2048);
    });

    it('should return 0 if no files', async () => {
      const mockObjectId = { toString: () => '507f1f77bcf86cd799439011' };
      (Types.ObjectId as unknown as jest.Mock) = jest.fn().mockReturnValue(mockObjectId) as any;

      (FileMetadataModel.aggregate as jest.Mock) = jest.fn().mockResolvedValue([]);

      const result = await fileMetadataRepository.getTotalStorageByProject(
        '507f1f77bcf86cd799439011'
      );

      expect(result).toBe(0);
    });
  });

  describe('countByProjectId', () => {
    it('should count files in project', async () => {
      (FileMetadataModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(5);

      const count = await fileMetadataRepository.countByProjectId('507f1f77bcf86cd799439011');

      expect(FileMetadataModel.countDocuments).toHaveBeenCalledWith({
        projectId: expect.objectContaining({ toString: expect.any(Function) }),
        deletedAt: null,
      });
      expect(count).toBe(5);
    });
  });

  describe('getPendingFiles', () => {
    it('should find pending files', async () => {
      const mockFiles = [
        {
          _id: { toString: () => 'file-1' },
          processingStatus: ProcessingStatus.PENDING,
        },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockFiles),
          }),
        }),
      });

      const result = await fileMetadataRepository.getPendingFiles(10);

      expect(FileMetadataModel.find).toHaveBeenCalledWith({
        processingStatus: ProcessingStatus.PENDING,
        deletedAt: null,
      });
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('list', () => {
    it('should list files with pagination', async () => {
      const mockFiles = [
        {
          _id: { toString: () => 'file-1' },
          filename: 'test.txt',
        },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockFiles),
              }),
            }),
          }),
        }),
      });

      (FileMetadataModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await fileMetadataRepository.list('project-123', 1, 10);

      expect(result.files).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should list files with processingStatus filter', async () => {
      const mockFiles = [
        {
          _id: { toString: () => 'file-1' },
          processingStatus: ProcessingStatus.COMPLETED,
        },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockFiles),
              }),
            }),
          }),
        }),
      });

      (FileMetadataModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await fileMetadataRepository.list('project-123', 1, 10, {
        processingStatus: ProcessingStatus.COMPLETED,
      });

      expect(result.files).toBeDefined();
    });

    it('should list files with mimetype filter', async () => {
      const mockFiles = [
        {
          _id: { toString: () => 'file-1' },
          mimetype: 'text/plain',
        },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockFiles),
              }),
            }),
          }),
        }),
      });

      (FileMetadataModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await fileMetadataRepository.list('project-123', 1, 10, {
        mimetype: 'text/plain',
      });

      expect(result.files).toBeDefined();
    });

    it('should list files with tags filter', async () => {
      const mockFiles = [
        {
          _id: { toString: () => 'file-1' },
          tags: ['important'],
        },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockFiles),
              }),
            }),
          }),
        }),
      });

      (FileMetadataModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await fileMetadataRepository.list('project-123', 1, 10, {
        tags: ['important'],
      });

      expect(result.files).toBeDefined();
    });
  });

  describe('findByIds', () => {
    it('should find files by multiple IDs', async () => {
      const mockFiles = [
        { _id: { toString: () => 'file-1' }, filename: 'test1.txt' },
        { _id: { toString: () => 'file-2' }, filename: 'test2.txt' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFiles),
      };
      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await fileMetadataRepository.findByIds(['file-1', 'file-2']);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty IDs array', async () => {
      const result = await fileMetadataRepository.findByIds([]);

      expect(result).toEqual([]);
    });
  });

  describe('findByHash', () => {
    it('should find file by hash within project', async () => {
      const mockFile = {
        _id: { toString: () => 'file-123' },
        hash: 'abc123',
        projectId: { toString: () => 'project-123' },
      };

      (FileMetadataModel.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });

      const result = await fileMetadataRepository.findByHash('abc123', 'project-123');

      expect(result).toBeDefined();
      expect(FileMetadataModel.findOne).toHaveBeenCalled();
    });

    it('should return null if file not found by hash', async () => {
      (FileMetadataModel.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await fileMetadataRepository.findByHash('nonexistent', 'project-123');

      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should find files by project ID', async () => {
      const mockFiles = [
        { _id: { toString: () => 'file-1' }, projectId: { toString: () => 'project-123' } },
        { _id: { toString: () => 'file-2' }, projectId: { toString: () => 'project-123' } },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockFiles),
        }),
      });

      const result = await fileMetadataRepository.findByProjectId('project-123');

      expect(result).toHaveLength(2);
    });
  });

  describe('findByUploadedBy', () => {
    it('should find files by uploader ID', async () => {
      const mockFiles = [{ _id: { toString: () => 'file-1' }, uploadedBy: 'user-123' }];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockFiles),
        }),
      });

      const result = await fileMetadataRepository.findByUploadedBy('user-123');

      expect(result).toHaveLength(1);
      expect(FileMetadataModel.find).toHaveBeenCalledWith({
        uploadedBy: 'user-123',
        deletedAt: null,
      });
    });
  });

  describe('findByProcessingStatus', () => {
    it('should find files by processing status', async () => {
      const mockFiles = [
        { _id: { toString: () => 'file-1' }, processingStatus: ProcessingStatus.PENDING },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockFiles),
        }),
      });

      const result = await fileMetadataRepository.findByProcessingStatus(
        'project-123',
        ProcessingStatus.PENDING
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('countByProcessingStatus', () => {
    it('should count files by processing status', async () => {
      (FileMetadataModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(5);

      const count = await fileMetadataRepository.countByProcessingStatus(
        'project-123',
        ProcessingStatus.COMPLETED
      );

      expect(count).toBe(5);
    });
  });

  describe('update', () => {
    it('should update file metadata', async () => {
      const mockFile = {
        _id: { toString: () => 'file-123' },
        originalFilename: 'updated.txt',
      };

      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockFile),
        }),
      });

      const result = await fileMetadataRepository.update('file-123', {
        tags: ['updated'],
      });

      expect(result).toBeDefined();
    });

    it('should return null if file not found during update', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await fileMetadataRepository.update('non-existent', {
        tags: ['test'],
      });

      expect(result).toBeNull();
    });
  });

  describe('updateProcessingStatus - FAILED status', () => {
    it('should update status to FAILED with error message', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateProcessingStatus(
        'file-123',
        ProcessingStatus.FAILED,
        'Processing error occurred'
      );

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          processingStatus: ProcessingStatus.FAILED,
          processingCompletedAt: expect.any(Date),
          errorMessage: 'Processing error occurred',
        },
      });
    });

    it('should use default error message when empty string provided', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateProcessingStatus('file-123', ProcessingStatus.FAILED, '');

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          processingStatus: ProcessingStatus.FAILED,
          processingCompletedAt: expect.any(Date),
          errorMessage: 'Processing failed',
        },
      });
    });

    it('should use default error message when undefined', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateProcessingStatus('file-123', ProcessingStatus.FAILED);

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          processingStatus: ProcessingStatus.FAILED,
          processingCompletedAt: expect.any(Date),
          errorMessage: 'Processing failed',
        },
      });
    });
  });

  describe('updateVectorIndexed - edge cases', () => {
    it('should update without optional parameters', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateVectorIndexed('file-123', true);

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          vectorIndexed: true,
          vectorIndexedAt: expect.any(Date),
        },
      });
    });

    it('should update with vectorCollection only', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateVectorIndexed('file-123', true, 'my-collection');

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          vectorIndexed: true,
          vectorIndexedAt: expect.any(Date),
          vectorCollection: 'my-collection',
        },
      });
    });

    it('should update with chunkCount of 0', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateVectorIndexed('file-123', true, undefined, 0);

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: {
          vectorIndexed: true,
          vectorIndexedAt: expect.any(Date),
          chunkCount: 0,
        },
      });
    });
  });

  describe('updateLastAccessed', () => {
    it('should update last accessed timestamp', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.updateLastAccessed('file-123');

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $set: { lastAccessedAt: expect.any(Date) },
      });
    });
  });

  describe('incrementRetryCount - edge cases', () => {
    it('should increment retry count without error message', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.incrementRetryCount('file-123');

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $inc: { retryCount: 1 },
        $set: { lastRetryAt: expect.any(Date) },
      });
    });
  });

  describe('clearErrorMessage', () => {
    it('should clear error message', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await fileMetadataRepository.clearErrorMessage('file-123');

      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith('file-123', {
        $unset: { errorMessage: 1 },
      });
    });
  });

  describe('search', () => {
    it('should search files by filename', async () => {
      const mockFiles = [
        { _id: { toString: () => 'file-1' }, originalFilename: 'test-document.txt' },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockFiles),
              }),
            }),
          }),
        }),
      });

      (FileMetadataModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await fileMetadataRepository.search('project-123', 'document', 1, 10);

      expect(result.files).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getRetryableFiles', () => {
    it('should get failed files that can be retried', async () => {
      const mockFiles = [
        {
          _id: { toString: () => 'file-1' },
          processingStatus: ProcessingStatus.FAILED,
          retryCount: 1,
        },
      ];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockFiles),
          }),
        }),
      });

      const result = await fileMetadataRepository.getRetryableFiles(3, 10);

      expect(FileMetadataModel.find).toHaveBeenCalledWith({
        processingStatus: ProcessingStatus.FAILED,
        retryCount: { $lt: 3 },
        deletedAt: null,
      });
      expect(result).toHaveLength(1);
    });

    it('should use default parameters', async () => {
      const mockFiles: unknown[] = [];

      (FileMetadataModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockFiles),
          }),
        }),
      });

      await fileMetadataRepository.getRetryableFiles();

      expect(FileMetadataModel.find).toHaveBeenCalledWith({
        processingStatus: ProcessingStatus.FAILED,
        retryCount: { $lt: 3 },
        deletedAt: null,
      });
    });
  });

  describe('delete - edge cases', () => {
    it('should return false if file not found during delete', async () => {
      (FileMetadataModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await fileMetadataRepository.delete('non-existent');

      expect(result).toBe(false);
    });
  });
});
