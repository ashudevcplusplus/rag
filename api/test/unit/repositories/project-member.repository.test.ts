import { projectMemberRepository } from '../../../src/repositories/project-member.repository';
import { ProjectMemberModel } from '../../../src/models/project-member.model';
import { ProjectRole } from '@rag/types';

// Mock Mongoose model
jest.mock('../../../src/models/project-member.model');

describe('ProjectMemberRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('should add a member to a project', async () => {
      const mockData = {
        projectId: 'project-123',
        userId: 'user-123',
        role: ProjectRole.VIEWER,
      };

      const mockSavedMember = {
        ...mockData,
        _id: { toString: () => 'member-123' },
        projectId: { toString: () => 'project-123' },
        userId: { toString: () => 'user-123' },
        createdAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: 'member-123',
          projectId: 'project-123',
          userId: 'user-123',
        }),
      };

      (ProjectMemberModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedMember),
      }));

      const result = await projectMemberRepository.add(mockData);

      expect(ProjectMemberModel).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(
        expect.objectContaining({
          projectId: 'project-123',
          userId: 'user-123',
        })
      );
    });
  });

  describe('findByProjectAndUser', () => {
    it('should find member by project and user ID', async () => {
      const mockMember = {
        _id: { toString: () => 'member-123' },
        projectId: { toString: () => 'project-123' },
        userId: { toString: () => 'user-123' },
        role: ProjectRole.VIEWER,
      };

      (ProjectMemberModel.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMember),
      });

      const result = await projectMemberRepository.findByProjectAndUser('project-123', 'user-123');

      expect(ProjectMemberModel.findOne).toHaveBeenCalledWith({
        projectId: 'project-123',
        userId: 'user-123',
      });
      expect(result).toBeDefined();
    });

    it('should return null if member not found', async () => {
      (ProjectMemberModel.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await projectMemberRepository.findByProjectAndUser('project-123', 'user-999');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update member role', async () => {
      const mockUpdated = {
        _id: { toString: () => 'member-123' },
        role: ProjectRole.ADMIN,
      };

      (ProjectMemberModel.findOneAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await projectMemberRepository.update('project-123', 'user-123', {
        role: ProjectRole.ADMIN,
      });

      expect(ProjectMemberModel.findOneAndUpdate).toHaveBeenCalledWith(
        { projectId: 'project-123', userId: 'user-123' },
        { $set: { role: ProjectRole.ADMIN } },
        { new: true, runValidators: true }
      );
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should remove member from project', async () => {
      (ProjectMemberModel.findOneAndDelete as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'member-123',
      });

      const result = await projectMemberRepository.remove('project-123', 'user-123');

      expect(ProjectMemberModel.findOneAndDelete).toHaveBeenCalledWith({
        projectId: 'project-123',
        userId: 'user-123',
      });
      expect(result).toBe(true);
    });

    it('should return false if member not found', async () => {
      (ProjectMemberModel.findOneAndDelete as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await projectMemberRepository.remove('project-123', 'user-999');

      expect(result).toBe(false);
    });
  });

  describe('isMember', () => {
    it('should return true if user is a member', async () => {
      (ProjectMemberModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await projectMemberRepository.isMember('project-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should return false if user is not a member', async () => {
      (ProjectMemberModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(0);

      const result = await projectMemberRepository.isMember('project-123', 'user-999');

      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has specific role', async () => {
      (ProjectMemberModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await projectMemberRepository.hasRole(
        'project-123',
        'user-123',
        ProjectRole.ADMIN
      );

      expect(ProjectMemberModel.countDocuments).toHaveBeenCalledWith({
        projectId: 'project-123',
        userId: 'user-123',
        role: ProjectRole.ADMIN,
      });
      expect(result).toBe(true);
    });
  });

  describe('countByProjectId', () => {
    it('should count members in a project', async () => {
      (ProjectMemberModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(5);

      const count = await projectMemberRepository.countByProjectId('project-123');

      expect(ProjectMemberModel.countDocuments).toHaveBeenCalledWith({
        projectId: 'project-123',
      });
      expect(count).toBe(5);
    });
  });

  describe('list', () => {
    it('should list members with pagination', async () => {
      const mockMembers = [
        {
          _id: { toString: () => 'member-1' },
          projectId: { toString: () => 'project-123' },
          userId: { toString: () => 'user-1' },
        },
      ];

      (ProjectMemberModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMembers),
              }),
            }),
          }),
        }),
      });

      (ProjectMemberModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await projectMemberRepository.list('project-123', 1, 10);

      expect(result.members).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should list members with role filter', async () => {
      const mockMembers = [
        {
          _id: { toString: () => 'member-1' },
          projectId: { toString: () => 'project-123' },
          userId: { toString: () => 'user-1' },
          role: ProjectRole.ADMIN,
        },
      ];

      (ProjectMemberModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMembers),
              }),
            }),
          }),
        }),
      });

      (ProjectMemberModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await projectMemberRepository.list('project-123', 1, 10, {
        role: ProjectRole.ADMIN,
      });

      expect(result.members).toBeDefined();
    });
  });

  describe('findByProjectId', () => {
    it('should find all members of a project', async () => {
      const mockMembers = [
        {
          _id: { toString: () => 'member-1' },
          projectId: { toString: () => 'project-123' },
          userId: { toString: () => 'user-1' },
        },
        {
          _id: { toString: () => 'member-2' },
          projectId: { toString: () => 'project-123' },
          userId: { toString: () => 'user-2' },
        },
      ];

      (ProjectMemberModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMembers),
          }),
        }),
      });

      const result = await projectMemberRepository.findByProjectId('project-123');

      expect(ProjectMemberModel.find).toHaveBeenCalledWith({ projectId: 'project-123' });
      expect(result).toHaveLength(2);
    });
  });

  describe('findByUserId', () => {
    it('should find all projects a user is member of', async () => {
      const mockMembers = [
        {
          _id: { toString: () => 'member-1' },
          projectId: { toString: () => 'project-1' },
          userId: { toString: () => 'user-123' },
        },
        {
          _id: { toString: () => 'member-2' },
          projectId: { toString: () => 'project-2' },
          userId: { toString: () => 'user-123' },
        },
      ];

      (ProjectMemberModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMembers),
          }),
        }),
      });

      const result = await projectMemberRepository.findByUserId('user-123');

      expect(ProjectMemberModel.find).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(result).toHaveLength(2);
    });
  });

  describe('update - null case', () => {
    it('should return null if member not found during update', async () => {
      (ProjectMemberModel.findOneAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await projectMemberRepository.update('project-123', 'user-999', {
        role: ProjectRole.ADMIN,
      });

      expect(result).toBeNull();
    });
  });

  describe('countByUserId', () => {
    it('should count projects for a user', async () => {
      (ProjectMemberModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(3);

      const count = await projectMemberRepository.countByUserId('user-123');

      expect(ProjectMemberModel.countDocuments).toHaveBeenCalledWith({
        userId: 'user-123',
      });
      expect(count).toBe(3);
    });
  });

  describe('removeAllByProjectId', () => {
    it('should remove all members from a project', async () => {
      (ProjectMemberModel.deleteMany as jest.Mock) = jest.fn().mockResolvedValue({
        deletedCount: 5,
      });

      const count = await projectMemberRepository.removeAllByProjectId('project-123');

      expect(ProjectMemberModel.deleteMany).toHaveBeenCalledWith({
        projectId: 'project-123',
      });
      expect(count).toBe(5);
    });

    it('should return 0 if no members found', async () => {
      (ProjectMemberModel.deleteMany as jest.Mock) = jest.fn().mockResolvedValue({
        deletedCount: 0,
      });

      const count = await projectMemberRepository.removeAllByProjectId('empty-project');

      expect(count).toBe(0);
    });

    it('should handle undefined deletedCount', async () => {
      (ProjectMemberModel.deleteMany as jest.Mock) = jest.fn().mockResolvedValue({});

      const count = await projectMemberRepository.removeAllByProjectId('project-123');

      expect(count).toBe(0);
    });
  });

  describe('removeAllByUserId', () => {
    it('should remove user from all projects', async () => {
      (ProjectMemberModel.deleteMany as jest.Mock) = jest.fn().mockResolvedValue({
        deletedCount: 3,
      });

      const count = await projectMemberRepository.removeAllByUserId('user-123');

      expect(ProjectMemberModel.deleteMany).toHaveBeenCalledWith({
        userId: 'user-123',
      });
      expect(count).toBe(3);
    });

    it('should return 0 if user is not member of any project', async () => {
      (ProjectMemberModel.deleteMany as jest.Mock) = jest.fn().mockResolvedValue({
        deletedCount: 0,
      });

      const count = await projectMemberRepository.removeAllByUserId('non-member');

      expect(count).toBe(0);
    });

    it('should handle undefined deletedCount', async () => {
      (ProjectMemberModel.deleteMany as jest.Mock) = jest.fn().mockResolvedValue({});

      const count = await projectMemberRepository.removeAllByUserId('user-123');

      expect(count).toBe(0);
    });
  });

  describe('hasRole - false case', () => {
    it('should return false if user does not have specific role', async () => {
      (ProjectMemberModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(0);

      const result = await projectMemberRepository.hasRole(
        'project-123',
        'user-123',
        ProjectRole.ADMIN
      );

      expect(result).toBe(false);
    });
  });
});
