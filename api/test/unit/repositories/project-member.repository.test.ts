import { projectMemberRepository } from '../../../src/repositories/project-member.repository';
import { ProjectMemberModel } from '../../../src/models/project-member.model';
import { ProjectRole } from '../../../src/types/enums';

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
  });
});
