import { projectRepository } from '../../../src/repositories/project.repository';
import { ProjectModel } from '../../../src/models/project.model';
import { FileMetadataModel } from '../../../src/models/file-metadata.model';
import { EmbeddingModel } from '../../../src/models/embedding.model';
import { ProjectStatus, Visibility } from '../../../src/types/enums';

// Type for mock documents
interface MockDocument {
  _id?: { toString: () => string } | string;
  [key: string]: unknown;
}

// Mock Mongoose model
jest.mock('../../../src/models/project.model');
jest.mock('../../../src/models/file-metadata.model');
jest.mock('../../../src/models/embedding.model');
jest.mock('../../../src/repositories/helpers', () => ({
  toStringId: jest.fn((doc: MockDocument) => ({ ...doc, _id: doc._id?.toString?.() || doc._id })),
  toStringIds: jest.fn((docs: MockDocument[]) =>
    docs.map((doc) => ({ ...doc, _id: doc._id?.toString?.() || doc._id }))
  ),
}));

jest.mock('../../../src/repositories/file-metadata.repository', () => ({
  fileMetadataRepository: {
    findByProjectId: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../src/services/vector.service', () => ({
  VectorService: {
    deleteByProjectId: jest.fn(),
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
  },
}));

describe('ProjectRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project', async () => {
      const mockData = {
        companyId: 'company-123',
        ownerId: 'user-123',
        name: 'Test Project',
        slug: 'test-project',
        visibility: Visibility.PRIVATE,
        tags: [],
      };

      const mockSavedProject = {
        ...mockData,
        _id: { toString: () => 'project-123' },
        companyId: { toString: () => 'company-123' },
        ownerId: { toString: () => 'user-123' },
        status: ProjectStatus.ACTIVE,
        fileCount: 0,
        totalSize: 0,
        vectorCount: 0,
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: { toString: () => 'project-123' },
          companyId: { toString: () => 'company-123' },
          ownerId: { toString: () => 'user-123' },
        }),
      };

      (ProjectModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedProject),
      }));

      const result = await projectRepository.create(mockData);

      expect(ProjectModel).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(
        expect.objectContaining({
          name: mockData.name,
        })
      );
    });
  });

  describe('findById', () => {
    it('should find project by ID', async () => {
      const mockProject = {
        _id: { toString: () => 'project-123' },
        name: 'Test Project',
        companyId: { toString: () => 'company-123' },
        ownerId: { toString: () => 'user-123' },
      };

      (ProjectModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProject),
        }),
      });

      const result = await projectRepository.findById('project-123');

      expect(ProjectModel.findById).toHaveBeenCalledWith('project-123');
      expect(result).toBeDefined();
    });

    it('should return null if project not found', async () => {
      (ProjectModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await projectRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find project by slug within company', async () => {
      const mockProject = {
        _id: { toString: () => 'project-123' },
        name: 'Test Project',
        slug: 'test-project',
      };

      (ProjectModel.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await projectRepository.findBySlug('company-123', 'test-project');

      expect(ProjectModel.findOne).toHaveBeenCalledWith({
        companyId: 'company-123',
        slug: 'test-project',
        deletedAt: null,
      });
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update project', async () => {
      const mockUpdated = {
        _id: { toString: () => 'project-123' },
        name: 'Updated Project',
        description: 'New description',
      };

      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUpdated),
        }),
      });

      const result = await projectRepository.update('project-123', {
        description: 'New description',
      });

      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'project-123',
        { $set: { description: 'New description' } },
        { new: true, runValidators: true }
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateStats', () => {
    it('should update project stats', async () => {
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(true);

      await projectRepository.updateStats('project-123', {
        fileCount: 5,
        totalSize: 1024000,
        vectorCount: 50,
      });

      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith('project-123', {
        $inc: {
          fileCount: 5,
          totalSize: 1024000,
          vectorCount: 50,
        },
      });
    });
  });

  describe('delete', () => {
    it('should soft delete project', async () => {
      (ProjectModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'project-123',
          companyId: 'company-123',
        }),
      });

      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest
        .fn()
        .mockResolvedValue({ _id: 'project-123' });

      const result = await projectRepository.delete('project-123');

      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'project-123',
        { $set: { deletedAt: expect.any(Date), status: ProjectStatus.DELETED } },
        { new: true }
      );
      expect(result).toBe(true);
    });
  });

  describe('archive', () => {
    it('should archive project', async () => {
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest
        .fn()
        .mockResolvedValue({ _id: 'project-123' });

      const result = await projectRepository.archive('project-123');

      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith('project-123', {
        $set: { archivedAt: expect.any(Date), status: ProjectStatus.ARCHIVED },
      });
      expect(result).toBe(true);
    });
  });

  describe('list', () => {
    it('should list projects with pagination', async () => {
      const mockProjects = [
        {
          _id: { toString: () => 'project-1' },
          name: 'Project 1',
        },
        {
          _id: { toString: () => 'project-2' },
          name: 'Project 2',
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockProjects),
              }),
            }),
          }),
        }),
      });

      (ProjectModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(10);

      const result = await projectRepository.list('company-123', 1, 10);

      expect(result.projects).toBeDefined();
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('countByCompanyId', () => {
    it('should count projects by company', async () => {
      (ProjectModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(5);

      const count = await projectRepository.countByCompanyId('company-123');

      expect(ProjectModel.countDocuments).toHaveBeenCalledWith({
        companyId: 'company-123',
        deletedAt: null,
      });
      expect(count).toBe(5);
    });
  });

  describe('search', () => {
    it('should search projects by term', async () => {
      const mockProjects = [
        {
          _id: { toString: () => 'project-1' },
          name: 'Test Project',
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockProjects),
              }),
            }),
          }),
        }),
      });

      (ProjectModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await projectRepository.search('company-123', 'test', 1, 10);

      expect(result.projects).toBeDefined();
      expect(result.total).toBe(1);
    });
  });

  describe('findByCompanyId', () => {
    it('should find projects by company ID', async () => {
      const mockProjects = [
        {
          _id: { toString: () => 'project-1' },
          name: 'Project 1',
          companyId: { toString: () => 'company-123' },
        },
        {
          _id: { toString: () => 'project-2' },
          name: 'Project 2',
          companyId: { toString: () => 'company-123' },
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProjects),
        }),
      });

      const result = await projectRepository.findByCompanyId('company-123');

      expect(ProjectModel.find).toHaveBeenCalledWith({
        companyId: 'company-123',
        deletedAt: null,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findByOwnerId', () => {
    it('should find projects by owner ID', async () => {
      const mockProjects = [
        {
          _id: { toString: () => 'project-1' },
          name: 'Project 1',
          ownerId: { toString: () => 'user-123' },
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProjects),
        }),
      });

      const result = await projectRepository.findByOwnerId('user-123');

      expect(ProjectModel.find).toHaveBeenCalledWith({
        ownerId: 'user-123',
        deletedAt: null,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findBySlug', () => {
    it('should return null if project not found by slug', async () => {
      (ProjectModel.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await projectRepository.findBySlug('company-123', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update - null case', () => {
    it('should return null if project not found during update', async () => {
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await projectRepository.update('non-existent', {
        description: 'New description',
      });

      expect(result).toBeNull();
    });
  });

  describe('unarchive', () => {
    it('should unarchive project', async () => {
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest
        .fn()
        .mockResolvedValue({ _id: 'project-123' });

      const result = await projectRepository.unarchive('project-123');

      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith('project-123', {
        $set: { archivedAt: null, status: ProjectStatus.ACTIVE },
      });
      expect(result).toBe(true);
    });

    it('should return false if project not found', async () => {
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await projectRepository.unarchive('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('archive - false case', () => {
    it('should return false if project not found during archive', async () => {
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await projectRepository.archive('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('delete - false case', () => {
    it('should return false if project not found during delete', async () => {
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await projectRepository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('list with filters', () => {
    it('should list projects with status filter', async () => {
      const mockProjects = [
        {
          _id: { toString: () => 'project-1' },
          name: 'Project 1',
          status: ProjectStatus.ACTIVE,
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockProjects),
              }),
            }),
          }),
        }),
      });

      (ProjectModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await projectRepository.list('company-123', 1, 10, {
        status: ProjectStatus.ACTIVE,
      });

      expect(result.projects).toBeDefined();
      expect(result.total).toBe(1);
    });

    it('should list projects with ownerId filter', async () => {
      const mockProjects = [
        {
          _id: { toString: () => 'project-1' },
          name: 'Project 1',
          ownerId: { toString: () => 'user-123' },
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockProjects),
              }),
            }),
          }),
        }),
      });

      (ProjectModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await projectRepository.list('company-123', 1, 10, {
        ownerId: 'user-123',
      });

      expect(result.projects).toBeDefined();
    });

    it('should list projects with tags filter', async () => {
      const mockProjects = [
        {
          _id: { toString: () => 'project-1' },
          name: 'Project 1',
          tags: ['important', 'active'],
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockProjects),
              }),
            }),
          }),
        }),
      });

      (ProjectModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await projectRepository.list('company-123', 1, 10, {
        tags: ['important'],
      });

      expect(result.projects).toBeDefined();
    });

    it('should list projects with syncStats and update stats when needed', async () => {
      const projectId = '507f1f77bcf86cd799439011';
      const mockProjects = [
        {
          _id: { toString: () => projectId },
          name: 'Project 1',
          fileCount: 0,
          totalSize: 0,
          vectorCount: 0,
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockProjects),
              }),
            }),
          }),
        }),
      });

      (ProjectModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);
      (FileMetadataModel.aggregate as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{ _id: projectId, fileCount: 5, totalSize: 10240 }]);
      (EmbeddingModel.aggregate as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{ _id: projectId, vectorCount: 50 }]);
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      const result = await projectRepository.list('company-123', 1, 10, {
        syncStats: true,
      });

      expect(result.projects).toBeDefined();
      expect(FileMetadataModel.aggregate).toHaveBeenCalled();
      expect(EmbeddingModel.aggregate).toHaveBeenCalled();
    });

    it('should not sync stats when they match', async () => {
      const projectId = '507f1f77bcf86cd799439012';
      const mockProjects = [
        {
          _id: { toString: () => projectId },
          name: 'Project 1',
          fileCount: 5,
          totalSize: 10240,
          vectorCount: 50,
        },
      ];

      (ProjectModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockProjects),
              }),
            }),
          }),
        }),
      });

      (ProjectModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);
      (FileMetadataModel.aggregate as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{ _id: projectId, fileCount: 5, totalSize: 10240 }]);
      (EmbeddingModel.aggregate as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{ _id: projectId, vectorCount: 50 }]);
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      const result = await projectRepository.list('company-123', 1, 10, {
        syncStats: true,
      });

      expect(result.projects).toBeDefined();
      // findByIdAndUpdate should not be called since stats match
      expect(ProjectModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return project stats', async () => {
      const mockProject = {
        _id: { toString: () => 'project-123' },
        fileCount: 10,
        totalSize: 102400,
        vectorCount: 100,
      };

      (ProjectModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProject),
        }),
      });

      const result = await projectRepository.getStats('project-123');

      expect(result).toEqual({
        fileCount: 10,
        totalSize: 102400,
        vectorCount: 100,
      });
    });

    it('should return null if project not found', async () => {
      (ProjectModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await projectRepository.getStats('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('recalculateStats', () => {
    it('should recalculate and update project stats', async () => {
      const projectId = '507f1f77bcf86cd799439013';
      const mockProject = {
        _id: { toString: () => projectId },
        fileCount: 0,
        totalSize: 0,
        vectorCount: 0,
      };

      (ProjectModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProject),
        }),
      });

      (FileMetadataModel.aggregate as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{ _id: null, fileCount: 15, totalSize: 512000 }]);
      (EmbeddingModel.aggregate as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{ _id: null, vectorCount: 150 }]);
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({});

      const result = await projectRepository.recalculateStats(projectId);

      expect(result).toBe(true);
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(projectId, {
        $set: {
          fileCount: 15,
          totalSize: 512000,
          vectorCount: 150,
        },
      });
    });

    it('should return false if project not found', async () => {
      (ProjectModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await projectRepository.recalculateStats('507f1f77bcf86cd799439099');

      expect(result).toBe(false);
    });

    it('should handle empty aggregation results', async () => {
      const projectId = '507f1f77bcf86cd799439014';
      const mockProject = {
        _id: { toString: () => projectId },
        fileCount: 5,
        totalSize: 1024,
        vectorCount: 10,
      };

      (ProjectModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProject),
        }),
      });

      (FileMetadataModel.aggregate as jest.Mock) = jest.fn().mockResolvedValue([]);
      (EmbeddingModel.aggregate as jest.Mock) = jest.fn().mockResolvedValue([]);
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({});

      const result = await projectRepository.recalculateStats(projectId);

      expect(result).toBe(true);
      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(projectId, {
        $set: {
          fileCount: 0,
          totalSize: 0,
          vectorCount: 0,
        },
      });
    });
  });
});
