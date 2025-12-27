import { Request, Response } from 'express';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  archiveProject,
  getProjectStats,
  listProjectFiles,
  searchProjects,
  getFilePreview,
  deleteFile,
  downloadFile,
  reindexFile,
  getIndexingStats,
  bulkReindexFailed,
} from '../../../src/controllers/project.controller';
import { projectRepository } from '../../../src/repositories/project.repository';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { embeddingRepository } from '../../../src/repositories/embedding.repository';
import { DeletionService } from '../../../src/services/deletion.service';
import { VectorService } from '../../../src/services/vector.service';
import { ProcessingStatus } from '../../../src/types/enums';
import {
  createMockResponse,
  createMockRequest,
  createMockProject,
  createMockFileMetadata,
  createMockCompany,
  createMockAuthenticatedRequest,
  createMockValidatedFileRequest,
  createMockValidatedProjectRequest,
  MockExpressResponse,
} from '../../lib/mock-utils';

// Mock dependencies
jest.mock('../../../src/repositories/project.repository');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/repositories/embedding.repository');
jest.mock('../../../src/services/deletion.service');
jest.mock('../../../src/services/vector.service');
jest.mock('../../../src/queue/queue.client', () => ({
  indexingQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  },
}));
jest.mock('../../../src/utils/async-events.util', () => ({
  publishAnalytics: jest.fn(),
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ProjectController', () => {
  let mockRes: MockExpressResponse;
  const mockNext = jest.fn();

  const companyId = 'company-123';
  const projectId = 'project-123';
  const fileId = 'file-123';
  const mockCompany = createMockCompany({ _id: companyId });
  const mockProject = createMockProject(companyId, { _id: projectId });
  const mockFile = createMockFileMetadata(projectId, { _id: fileId });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
  });

  describe('createProject', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        body: {
          name: 'Test Project',
          slug: 'test-project',
        },
      });

      await createProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getProject', () => {
    it('should return project when found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);

      const mockReq = createMockRequest({
        params: { projectId },
        query: {},
      });

      await getProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          project: expect.any(Object),
        })
      );
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockRequest({
        params: { projectId: 'non-existent' },
        query: {},
      });

      await getProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should recalculate stats when syncStats is true', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (projectRepository.recalculateStats as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        params: { projectId },
        query: { syncStats: 'true' },
      });

      await getProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(projectRepository.recalculateStats).toHaveBeenCalledWith(projectId);
    });
  });

  describe('listProjects', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        query: { page: '1', limit: '10' },
      });

      await listProjects(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateProject', () => {
    it('should return 404 when project not found', async () => {
      (projectRepository.update as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockRequest({
        params: { projectId: 'non-existent' },
        body: { name: 'Updated Project' },
      });

      await updateProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteProject', () => {
    it('should return 404 when project not found', async () => {
      (DeletionService.deleteProject as jest.Mock).mockResolvedValue(false);

      const mockReq = createMockRequest({
        params: { projectId: 'non-existent' },
      });

      await deleteProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('archiveProject', () => {
    it('should archive project successfully', async () => {
      (projectRepository.archive as jest.Mock).mockResolvedValue(true);

      const mockReq = createMockRequest({
        params: { projectId },
        body: { archive: true },
      });

      await archiveProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(projectRepository.archive).toHaveBeenCalledWith(projectId);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Project archived successfully',
        })
      );
    });

    it('should unarchive project successfully', async () => {
      (projectRepository.unarchive as jest.Mock).mockResolvedValue(true);

      const mockReq = createMockRequest({
        params: { projectId },
        body: { archive: false },
      });

      await archiveProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(projectRepository.unarchive).toHaveBeenCalledWith(projectId);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Project unarchived successfully',
        })
      );
    });

    it('should return 400 when archive is not a boolean', async () => {
      const mockReq = createMockRequest({
        params: { projectId },
        body: { archive: 'yes' },
      });

      await archiveProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.archive as jest.Mock).mockResolvedValue(false);

      const mockReq = createMockRequest({
        params: { projectId: 'non-existent' },
        body: { archive: true },
      });

      await archiveProject(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getProjectStats', () => {
    it('should return project stats', async () => {
      const stats = { fileCount: 10, totalSize: 1024000, vectorCount: 100 };
      (projectRepository.getStats as jest.Mock).mockResolvedValue(stats);

      const mockReq = createMockRequest({
        params: { projectId },
      });

      await getProjectStats(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({ stats });
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.getStats as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockRequest({
        params: { projectId: 'non-existent' },
      });

      await getProjectStats(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('listProjectFiles', () => {
    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockRequest({
        params: { projectId: 'non-existent' },
        query: { page: '1', limit: '10' },
      });

      await listProjectFiles(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('searchProjects', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        query: { q: 'test', page: '1', limit: '10' },
      });

      await searchProjects(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getFilePreview', () => {
    // Note: Validation tests (400/404 for company/project/file) are now in middleware tests
    // These tests assume validateFileAccess middleware has already run

    it('should return file content when embedding exists', async () => {
      const mockEmbedding = {
        _id: 'emb-1',
        contents: ['chunk1', 'chunk2'],
        chunkCount: 2,
      };
      (embeddingRepository.findByFileId as jest.Mock).mockResolvedValue(mockEmbedding);

      const mockReq = createMockValidatedFileRequest(mockCompany, mockProject, mockFile, {
        params: { projectId, fileId },
      });

      await getFilePreview(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.objectContaining({
            _id: mockFile._id,
          }),
          chunks: mockEmbedding.contents,
        })
      );
    });

    it('should return null content when embedding not found', async () => {
      (embeddingRepository.findByFileId as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockValidatedFileRequest(mockCompany, mockProject, mockFile, {
        params: { projectId, fileId },
      });

      await getFilePreview(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          content: null,
          chunks: [],
        })
      );
    });
  });

  describe('deleteFile', () => {
    // Note: Validation tests (400/404 for company/project/file) are now in middleware tests
    // These tests assume validateFileAccess middleware has already run

    it('should delete file successfully', async () => {
      (DeletionService.deleteFile as jest.Mock).mockResolvedValue(true);

      const mockReq = createMockValidatedFileRequest(mockCompany, mockProject, mockFile, {
        params: { projectId, fileId },
      });

      await deleteFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(DeletionService.deleteFile).toHaveBeenCalledWith(fileId);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'File deleted successfully' });
    });

    it('should return 404 when deletion service returns false', async () => {
      (DeletionService.deleteFile as jest.Mock).mockResolvedValue(false);

      const mockReq = createMockValidatedFileRequest(mockCompany, mockProject, mockFile, {
        params: { projectId, fileId },
      });

      await deleteFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('reindexFile', () => {
    // Note: Validation tests (400/404 for company/project/file) are now in middleware tests
    // These tests assume validateFileAccess middleware has already run

    it('should return 400 when file has invalid status for reindexing', async () => {
      const pendingFile = { ...mockFile, processingStatus: ProcessingStatus.PENDING };

      const mockReq = createMockValidatedFileRequest(mockCompany, mockProject, pendingFile, {
        params: { projectId, fileId },
      });

      await reindexFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getIndexingStats', () => {
    // Note: Validation tests (400/404 for company/project) are now in middleware tests
    // These tests assume validateProjectAccess middleware has already run

    it('should return indexing stats successfully', async () => {
      // Mock countByProcessingStatus to return numbers
      (fileMetadataRepository.countByProcessingStatus as jest.Mock).mockResolvedValue(0);
      // Mock getIndexingTimeStats to return timing stats
      (fileMetadataRepository.getIndexingTimeStats as jest.Mock).mockResolvedValue({
        averageTimeMs: null,
        minTimeMs: null,
        maxTimeMs: null,
        totalFilesCompleted: 0,
      });

      // Create request with validatedProject properly set
      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId },
      }) as Request & { validatedProject: typeof mockProject; validatedCompanyId: string };
      mockReq.validatedProject = mockProject;
      mockReq.validatedCompanyId = companyId;

      // The asyncHandler wrapper returns a non-async function that returns void
      // We need to wait for the internal promise to resolve
      await new Promise<void>((resolve) => {
        getIndexingStats(mockReq as unknown as Request, mockRes as unknown as Response, (err) => {
          mockNext(err);
          resolve();
        });
        // Also resolve after a short delay in case no error
        setTimeout(resolve, 100);
      });

      // Verify the mock was called
      expect(fileMetadataRepository.countByProcessingStatus).toHaveBeenCalled();
      expect(fileMetadataRepository.getIndexingTimeStats).toHaveBeenCalled();
      // Check that json was called with stats object including timing fields
      expect(mockRes.json).toHaveBeenCalledWith({
        stats: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          total: 0,
          averageProcessingTimeMs: null,
          minProcessingTimeMs: null,
          maxProcessingTimeMs: null,
        },
      });
    });
  });

  describe('bulkReindexFailed', () => {
    // Note: Validation tests (400/404 for company/project) are now in middleware tests
    // These tests assume validateProjectAccess middleware has already run

    it('should return message when no failed files exist', async () => {
      (fileMetadataRepository.findByProcessingStatus as jest.Mock).mockResolvedValue([]);

      const mockReq = createMockValidatedProjectRequest(mockCompany, mockProject, {
        params: { projectId },
      });

      await bulkReindexFailed(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No failed files to reindex',
        queued: 0,
      });
    });
  });
});
