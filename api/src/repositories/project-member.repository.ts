import { ProjectMemberModel, IProjectMemberDocument } from '../models/project-member.model';
import {
  AddProjectMemberDTO,
  UpdateProjectMemberDTO,
  IProjectMember,
} from '../schemas/project-member.schema';
import { FilterQuery } from 'mongoose';
import { toStringId, toStringIds } from './helpers';

export class ProjectMemberRepository {
  /**
   * Add a member to a project
   */
  async add(data: AddProjectMemberDTO): Promise<IProjectMember> {
    const member = new ProjectMemberModel(data);
    const saved = await member.save();
    return toStringId(saved.toObject()) as unknown as IProjectMember;
  }

  /**
   * Find member by project and user ID
   */
  async findByProjectAndUser(projectId: string, userId: string): Promise<IProjectMember | null> {
    const member = await ProjectMemberModel.findOne({ projectId, userId }).lean();
    if (!member) return null;
    return toStringId(member) as unknown as IProjectMember;
  }

  /**
   * Find all members of a project
   * Note: Sort by _id (descending) for backward compatibility with documents
   * created before timestamps: true was added (which had addedAt instead of createdAt)
   */
  async findByProjectId(projectId: string): Promise<IProjectMember[]> {
    const members = await ProjectMemberModel.find({ projectId })
      .sort({ _id: -1 })
      .populate('userId', 'firstName lastName email role')
      .lean();
    return toStringIds(members) as unknown as IProjectMember[];
  }

  /**
   * Find all projects a user is a member of
   * Note: Sort by _id (descending) for backward compatibility with legacy documents
   */
  async findByUserId(userId: string): Promise<IProjectMember[]> {
    const members = await ProjectMemberModel.find({ userId })
      .sort({ _id: -1 })
      .populate('projectId', 'name slug description')
      .lean();
    return toStringIds(members) as unknown as IProjectMember[];
  }

  /**
   * Update member role/permissions
   */
  async update(
    projectId: string,
    userId: string,
    data: UpdateProjectMemberDTO
  ): Promise<IProjectMember | null> {
    const member = await ProjectMemberModel.findOneAndUpdate(
      { projectId, userId },
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!member) return null;
    return toStringId(member) as unknown as IProjectMember;
  }

  /**
   * Remove a member from a project
   */
  async remove(projectId: string, userId: string): Promise<boolean> {
    const result = await ProjectMemberModel.findOneAndDelete({ projectId, userId });
    return !!result;
  }

  /**
   * Check if user is a member of a project
   */
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const count = await ProjectMemberModel.countDocuments({ projectId, userId });
    return count > 0;
  }

  /**
   * Check if user has specific role in a project
   */
  async hasRole(projectId: string, userId: string, role: string): Promise<boolean> {
    const count = await ProjectMemberModel.countDocuments({ projectId, userId, role });
    return count > 0;
  }

  /**
   * Get member count for a project
   */
  async countByProjectId(projectId: string): Promise<number> {
    return ProjectMemberModel.countDocuments({ projectId });
  }

  /**
   * Get project count for a user
   */
  async countByUserId(userId: string): Promise<number> {
    return ProjectMemberModel.countDocuments({ userId });
  }

  /**
   * List members with pagination
   */
  async list(
    projectId: string,
    page: number = 1,
    limit: number = 10,
    filters?: { role?: string }
  ): Promise<{
    members: IProjectMember[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: FilterQuery<IProjectMemberDocument> = { projectId };

    if (filters?.role) {
      query.role = filters.role;
    }

    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      ProjectMemberModel.find(query)
        .sort({ _id: -1 }) // Use _id for backward compatibility with legacy documents
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email role')
        .lean(),
      ProjectMemberModel.countDocuments(query),
    ]);

    return {
      members: toStringIds(members) as unknown as IProjectMember[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Remove all members from a project (used when deleting project)
   */
  async removeAllByProjectId(projectId: string): Promise<number> {
    const result = await ProjectMemberModel.deleteMany({ projectId });
    return result.deletedCount || 0;
  }

  /**
   * Remove user from all projects (used when deleting user)
   */
  async removeAllByUserId(userId: string): Promise<number> {
    const result = await ProjectMemberModel.deleteMany({ userId });
    return result.deletedCount || 0;
  }
}

// Export singleton instance
export const projectMemberRepository = new ProjectMemberRepository();
