import { Types } from 'mongoose';
import { DeletionService } from '../../../src/services/deletion.service';
import { ProjectModel } from '../../../src/models/project.model';
import { FileMetadataModel } from '../../../src/models/file-metadata.model';
import { VectorService } from '../../../src/services/vector.service';
import { CacheService } from '../../../src/services/cache.service';
import { ConsistencyCheckService } from '../../../src/services/consistency-check.service';
import { embeddingRepository } from '../../../src/repositories/embedding.repository';

// Mock dependencies
jest.mock('../../../src/models/project.model');
jest.mock('../../../src/models/file-metadata.model');
jest.mock('../../../src/services/vector.service');
jest.mock('../../../src/services/cache.service');
jest.mock('../../../src/services/consistency-check.service');
jest.mock('../../../src/repositories/embedding.repository');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('DeletionService', () => {
  const mockFileId = new Types.ObjectId().toString();
  const mockProjectId = new Types.ObjectId().toString();
  const mockCompanyId = new Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteFile', () => {
    const mockFile = {
      _id: new Types.ObjectId(mockFileId),
      projectId: mockProjectId,
      size: 1024,
      vectorIndexed: true,
      chunkCount: 10,
    };

    const mockProject = {
      _id: new Types.ObjectId(mockProjectId),
      companyId: new Types.ObjectId(mockCompanyId),
    };

    it('should delete file and clean up all resources successfully', async () => {
      // Setup mocks
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProject),
        }),
      });
      (VectorService.deleteByFileId as jest.Mock).mockResolvedValue(undefined);
      (embeddingRepository.deleteByFileId as jest.Mock).mockResolvedValue(1);
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockFileId });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (CacheService.clearCompany as jest.Mock).mockResolvedValue(undefined);
      (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockResolvedValue(undefined);

      const result = await DeletionService.deleteFile(mockFileId);

      expect(result).toBe(true);
      expect(VectorService.deleteByFileId).toHaveBeenCalledWith(
        `company_${mockCompanyId}`,
        mockFileId
      );
      expect(embeddingRepository.deleteByFileId).toHaveBeenCalledWith(mockFileId);
      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockFileId,
        { $set: { deletedAt: expect.any(Date) } },
        { new: true }
      );
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(mockProjectId, {
        $inc: {
          fileCount: -1,
          totalSize: -mockFile.size,
          vectorCount: -mockFile.chunkCount,
        },
      });
      expect(CacheService.clearCompany).toHaveBeenCalledWith(mockCompanyId.toString());
    });

    it('should return false if file is not found', async () => {
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await DeletionService.deleteFile(mockFileId);

      expect(result).toBe(false);
      expect(VectorService.deleteByFileId).not.toHaveBeenCalled();
    });

    it('should handle case when project is not found', async () => {
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockFileId });

      const result = await DeletionService.deleteFile(mockFileId);

      expect(result).toBe(true);
      // Vector deletion should be skipped
      expect(VectorService.deleteByFileId).not.toHaveBeenCalled();
    });

    it('should skip vector deletion for non-indexed files', async () => {
      const nonIndexedFile = { ...mockFile, vectorIndexed: false };
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(nonIndexedFile),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProject),
        }),
      });
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockFileId });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (CacheService.clearCompany as jest.Mock).mockResolvedValue(undefined);
      (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockResolvedValue(undefined);

      const result = await DeletionService.deleteFile(mockFileId);

      expect(result).toBe(true);
      expect(VectorService.deleteByFileId).not.toHaveBeenCalled();
      expect(embeddingRepository.deleteByFileId).not.toHaveBeenCalled();
    });

    it('should continue deletion even if vector cleanup fails', async () => {
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProject),
        }),
      });
      (VectorService.deleteByFileId as jest.Mock).mockRejectedValue(new Error('Qdrant error'));
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockFileId });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (CacheService.clearCompany as jest.Mock).mockResolvedValue(undefined);
      (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockResolvedValue(undefined);

      const result = await DeletionService.deleteFile(mockFileId);

      // Should still succeed despite vector deletion failure
      expect(result).toBe(true);
      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should handle null chunkCount in stats update', async () => {
      const fileWithoutChunks = { ...mockFile, chunkCount: null };
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(fileWithoutChunks),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProject),
        }),
      });
      (VectorService.deleteByFileId as jest.Mock).mockResolvedValue(undefined);
      (embeddingRepository.deleteByFileId as jest.Mock).mockResolvedValue(1);
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockFileId });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (CacheService.clearCompany as jest.Mock).mockResolvedValue(undefined);
      (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockResolvedValue(undefined);

      const result = await DeletionService.deleteFile(mockFileId);

      expect(result).toBe(true);
      // Stats update should not include vectorCount
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(mockProjectId, {
        $inc: {
          fileCount: -1,
          totalSize: -fileWithoutChunks.size,
        },
      });
    });
  });

  describe('deleteProject', () => {
    const mockProject = {
      _id: new Types.ObjectId(mockProjectId),
      companyId: new Types.ObjectId(mockCompanyId),
    };

    const mockFiles = [
      { _id: new Types.ObjectId(), size: 1024 },
      { _id: new Types.ObjectId(), size: 2048 },
    ];

    it('should delete project and all associated files', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFiles),
      });
      (VectorService.deleteByProjectId as jest.Mock).mockResolvedValue(undefined);
      (embeddingRepository.deleteByFileId as jest.Mock).mockResolvedValue(1);
      (FileMetadataModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockProjectId });
      (CacheService.clearCompany as jest.Mock).mockResolvedValue(undefined);
      (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockResolvedValue(undefined);

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
      expect(VectorService.deleteByProjectId).toHaveBeenCalledWith(
        `company_${mockCompanyId}`,
        mockProjectId,
        mockFiles.map((f) => f._id.toString())
      );
      expect(embeddingRepository.deleteByFileId).toHaveBeenCalledTimes(2);
      expect(FileMetadataModel.updateMany).toHaveBeenCalled();
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProjectId,
        { $set: { deletedAt: expect.any(Date), status: 'DELETED' } },
        { new: true }
      );
    });

    it('should return false if project is not found', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(false);
      expect(VectorService.deleteByProjectId).not.toHaveBeenCalled();
    });

    it('should handle empty project with no files', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockProjectId });
      (CacheService.clearCompany as jest.Mock).mockResolvedValue(undefined);
      (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockResolvedValue(undefined);

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
      expect(VectorService.deleteByProjectId).not.toHaveBeenCalled();
      expect(FileMetadataModel.updateMany).not.toHaveBeenCalled();
    });

    it('should continue deletion even if vector cleanup fails', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFiles),
      });
      (VectorService.deleteByProjectId as jest.Mock).mockRejectedValue(new Error('Qdrant error'));
      (FileMetadataModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockProjectId });
      (CacheService.clearCompany as jest.Mock).mockResolvedValue(undefined);
      (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockResolvedValue(undefined);

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
    });

    it('should handle project without companyId', async () => {
      const projectWithoutCompany = { ...mockProject, companyId: null };
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(projectWithoutCompany),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFiles),
      });
      (FileMetadataModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockProjectId });

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
      // Vector deletion should be skipped
      expect(VectorService.deleteByProjectId).not.toHaveBeenCalled();
    });

    it('should handle cache clear failure gracefully', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: mockProjectId });
      (CacheService.clearCompany as jest.Mock).mockRejectedValue(new Error('Cache error'));

      const result = await DeletionService.deleteProject(mockProjectId);

      // Should still succeed despite cache clear failure
      expect(result).toBe(true);
    });
  });
});
