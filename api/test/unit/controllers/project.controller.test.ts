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
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        params: { projectId, fileId },
      });

      await getFilePreview(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId: 'non-existent', fileId },
      });

      await getFilePreview(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when project belongs to different company', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId, fileId },
      });

      await getFilePreview(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteFile', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        params: { projectId, fileId },
      });

      await deleteFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId: 'non-existent', fileId },
      });

      await deleteFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when project belongs to different company', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId, fileId },
      });

      await deleteFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('reindexFile', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        params: { projectId, fileId },
      });

      await reindexFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId: 'non-existent', fileId },
      });

      await reindexFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when project belongs to different company', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId, fileId },
      });

      await reindexFile(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getIndexingStats', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        params: { projectId },
      });

      await getIndexingStats(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId: 'non-existent' },
      });

      await getIndexingStats(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when project belongs to different company', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId },
      });

      await getIndexingStats(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('bulkReindexFailed', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        params: { projectId },
      });

      await bulkReindexFailed(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId: 'non-existent' },
      });

      await bulkReindexFailed(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when project belongs to different company', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId },
      });

      await bulkReindexFailed(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
