import { projectRepository } from '../../../src/repositories/project.repository';
import { ProjectModel } from '../../../src/models/project.model';
import { ProjectStatus, Visibility } from '../../../src/schemas/project.schema';

// Mock Mongoose model
jest.mock('../../../src/models/project.model');
jest.mock('../../../src/repositories/helpers', () => ({
  toStringId: jest.fn((doc: any) => ({ ...doc, _id: doc._id?.toString() || doc._id })),
  toStringIds: jest.fn((docs: any[]) =>
    docs.map((doc) => ({ ...doc, _id: doc._id?.toString() || doc._id }))
  ),
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
      (ProjectModel.findByIdAndUpdate as jest.Mock) = jest
        .fn()
        .mockResolvedValue({ _id: 'project-123' });

      const result = await projectRepository.delete('project-123');

      expect(ProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'project-123',
        { $set: { deletedAt: expect.any(Date), status: 'DELETED' } },
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
        $set: { archivedAt: expect.any(Date), status: 'ARCHIVED' },
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
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockProjects),
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
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockProjects),
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
});
