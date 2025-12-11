import { DeletionService } from '../../../src/services/deletion.service';
import { ProjectModel } from '../../../src/models/project.model';
import { FileMetadataModel } from '../../../src/models/file-metadata.model';
import { VectorService } from '../../../src/services/vector.service';
import { CacheService } from '../../../src/services/cache.service';
import { ConsistencyCheckService } from '../../../src/services/consistency-check.service';
import { embeddingRepository } from '../../../src/repositories/embedding.repository';
import { ProjectStatus } from '../../../src/types/enums';
import { Types } from 'mongoose';
import { createObjectId, generateObjectId } from '../../lib/mock-utils';

// Mock dependencies
jest.mock('../../../src/models/project.model');
jest.mock('../../../src/models/file-metadata.model');
jest.mock('../../../src/services/vector.service');
jest.mock('../../../src/services/cache.service');
jest.mock('../../../src/services/consistency-check.service');
jest.mock('../../../src/repositories/embedding.repository');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

interface MockFileDocument {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  size: number;
  vectorIndexed: boolean;
  chunkCount: number;
}

interface MockProjectDocument {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
}

describe('DeletionService', () => {
  const mockFileId = generateObjectId();
  const mockProjectId = generateObjectId();
  const mockCompanyId = generateObjectId();

  const mockFile: MockFileDocument = {
    _id: createObjectId(mockFileId),
    projectId: createObjectId(mockProjectId),
    size: 1024,
    vectorIndexed: true,
    chunkCount: 5,
  };

  const mockProject: MockProjectDocument = {
    _id: createObjectId(mockProjectId),
    companyId: createObjectId(mockCompanyId),
    name: 'Test Project',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (VectorService.deleteByFileId as jest.Mock).mockResolvedValue(undefined);
    (VectorService.deleteByProjectId as jest.Mock).mockResolvedValue(undefined);
    (CacheService.clearCompany as jest.Mock).mockResolvedValue(undefined);
    (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockResolvedValue(undefined);
    (embeddingRepository.deleteByFileId as jest.Mock).mockResolvedValue(1);
  });

  describe('deleteFile', () => {
    it('should delete file and all associated resources', async () => {
      // Mock file lookup
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });

      // Mock project lookup
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProject),
      });

      // Mock soft delete
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockFile);

      // Mock project stats update
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      const result = await DeletionService.deleteFile(mockFileId);

      expect(result).toBe(true);

      // Verify vector deletion
      expect(VectorService.deleteByFileId).toHaveBeenCalledWith(
        `company_${mockCompanyId}`,
        mockFileId
      );

      // Verify embedding deletion
      expect(embeddingRepository.deleteByFileId).toHaveBeenCalledWith(mockFileId);

      // Verify soft delete
      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockFileId,
        { $set: { deletedAt: expect.any(Date) } },
        { new: true }
      );

      // Verify project stats update
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(mockFile.projectId, {
        $inc: {
          fileCount: -1,
          totalSize: -mockFile.size,
          vectorCount: -mockFile.chunkCount,
        },
      });

      // Verify cache cleanup
      expect(CacheService.clearCompany).toHaveBeenCalledWith(mockCompanyId);

      // Verify consistency check triggered
      expect(ConsistencyCheckService.publishConsistencyCheck).toHaveBeenCalledWith(mockCompanyId);
    });

    it('should return false if file not found', async () => {
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await DeletionService.deleteFile(mockFileId);

      expect(result).toBe(false);
      expect(VectorService.deleteByFileId).not.toHaveBeenCalled();
    });

    it('should skip vector deletion if file not indexed', async () => {
      const unindexedFile: MockFileDocument = { ...mockFile, vectorIndexed: false };

      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(unindexedFile),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(unindexedFile);
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      await DeletionService.deleteFile(mockFileId);

      expect(VectorService.deleteByFileId).not.toHaveBeenCalled();
      expect(embeddingRepository.deleteByFileId).not.toHaveBeenCalled();
    });

    it('should handle missing project gracefully', async () => {
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockFile);

      const result = await DeletionService.deleteFile(mockFileId);

      // Should still succeed with soft delete
      expect(result).toBe(true);
      // But vector deletion skipped since no project
      expect(VectorService.deleteByFileId).not.toHaveBeenCalled();
    });

    it('should continue if vector deletion fails', async () => {
      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (VectorService.deleteByFileId as jest.Mock).mockRejectedValue(new Error('Qdrant error'));
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockFile);
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      // Should not throw, should continue with deletion
      const result = await DeletionService.deleteFile(mockFileId);

      expect(result).toBe(true);
      expect(FileMetadataModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should not decrement vector count if chunkCount is 0', async () => {
      const fileWithNoChunks: MockFileDocument = { ...mockFile, chunkCount: 0 };

      (FileMetadataModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(fileWithNoChunks),
      });
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(fileWithNoChunks);
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      await DeletionService.deleteFile(mockFileId);

      // vectorCount should not be in the update
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(expect.anything(), {
        $inc: {
          fileCount: -1,
          totalSize: expect.any(Number),
        },
      });
    });
  });

  describe('deleteProject', () => {
    const mockFiles = [
      { _id: createObjectId(), projectId: mockProjectId, size: 100 },
      { _id: createObjectId(), projectId: mockProjectId, size: 200 },
    ];

    it('should delete project and all associated files', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFiles),
      });
      (FileMetadataModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);

      // Verify vector deletion for all files
      expect(VectorService.deleteByProjectId).toHaveBeenCalledWith(
        `company_${mockCompanyId}`,
        mockProjectId,
        mockFiles.map((f) => f._id.toString())
      );

      // Verify embedding deletion for each file
      expect(embeddingRepository.deleteByFileId).toHaveBeenCalledTimes(2);

      // Verify files soft-deleted
      expect(FileMetadataModel.updateMany).toHaveBeenCalled();

      // Verify project soft-deleted
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProjectId,
        { $set: { deletedAt: expect.any(Date), status: ProjectStatus.DELETED } },
        { new: true }
      );
    });

    it('should return false if project not found', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(false);
      expect(VectorService.deleteByProjectId).not.toHaveBeenCalled();
    });

    it('should handle project with no files', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
      expect(VectorService.deleteByProjectId).not.toHaveBeenCalled();
      expect(FileMetadataModel.updateMany).not.toHaveBeenCalled();
    });

    it('should continue if vector deletion fails', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFiles),
      });
      (VectorService.deleteByProjectId as jest.Mock).mockRejectedValue(
        new Error('Qdrant connection failed')
      );
      (FileMetadataModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should trigger cache cleanup after deletion', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      await DeletionService.deleteProject(mockProjectId);

      expect(CacheService.clearCompany).toHaveBeenCalledWith(mockCompanyId);
    });

    it('should handle cache cleanup failure gracefully', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);
      (CacheService.clearCompany as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
    });

    it('should handle consistency check failure gracefully', async () => {
      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);
      (ConsistencyCheckService.publishConsistencyCheck as jest.Mock).mockRejectedValue(
        new Error('Queue error')
      );

      // Should not throw
      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
    });

    it('should handle project without companyId', async () => {
      const projectWithoutCompany: MockProjectDocument = {
        ...mockProject,
        companyId: null as unknown as Types.ObjectId,
      };

      (ProjectModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(projectWithoutCompany),
      });
      (FileMetadataModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFiles),
      });
      (FileMetadataModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (ProjectModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);

      const result = await DeletionService.deleteProject(mockProjectId);

      expect(result).toBe(true);
      // Vector deletion should be skipped when no companyId
      expect(VectorService.deleteByProjectId).not.toHaveBeenCalled();
    });
  });
});
