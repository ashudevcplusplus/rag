import { ProjectModel, IProjectDocument } from '../models/project.model';
import { CreateProjectDTO, UpdateProjectDTO, IProject } from '../schemas/project.schema';
import { FilterQuery } from 'mongoose';
import { toStringId, toStringIds } from './helpers';

export class ProjectRepository {
  /**
   * Create a new project
   */
  async create(data: CreateProjectDTO): Promise<IProject> {
    const project = new ProjectModel(data);
    const saved = await project.save();
    return toStringId(saved.toObject()) as unknown as IProject;
  }

  /**
   * Find project by ID
   */
  async findById(id: string): Promise<IProject | null> {
    const project = await ProjectModel.findById(id).where({ deletedAt: null }).lean();
    if (!project) return null;
    return toStringId(project) as unknown as IProject;
  }

  /**
   * Find project by slug within a company
   */
  async findBySlug(companyId: string, slug: string): Promise<IProject | null> {
    const project = await ProjectModel.findOne({ companyId, slug, deletedAt: null }).lean();
    if (!project) return null;
    return toStringId(project) as unknown as IProject;
  }

  /**
   * Find projects by company ID
   */
  async findByCompanyId(companyId: string): Promise<IProject[]> {
    const projects = await ProjectModel.find({ companyId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();
    return toStringIds(projects) as unknown as IProject[];
  }

  /**
   * Find projects by owner ID
   */
  async findByOwnerId(ownerId: string): Promise<IProject[]> {
    const projects = await ProjectModel.find({ ownerId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();
    return toStringIds(projects) as unknown as IProject[];
  }

  /**
   * Update project
   */
  async update(id: string, data: UpdateProjectDTO): Promise<IProject | null> {
    const project = await ProjectModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .where({ deletedAt: null })
      .lean();

    if (!project) return null;
    return toStringId(project) as unknown as IProject;
  }

  /**
   * Update project stats
   */
  async updateStats(
    id: string,
    stats: { fileCount?: number; totalSize?: number; vectorCount?: number }
  ): Promise<void> {
    await ProjectModel.findByIdAndUpdate(id, { $inc: stats });
  }

  /**
   * Archive project
   */
  async archive(id: string): Promise<boolean> {
    const result = await ProjectModel.findByIdAndUpdate(id, {
      $set: { archivedAt: new Date(), status: 'ARCHIVED' },
    });
    return !!result;
  }

  /**
   * Unarchive project
   */
  async unarchive(id: string): Promise<boolean> {
    const result = await ProjectModel.findByIdAndUpdate(id, {
      $set: { archivedAt: null, status: 'ACTIVE' },
    });
    return !!result;
  }

  /**
   * Soft delete project
   */
  async delete(id: string): Promise<boolean> {
    const result = await ProjectModel.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date(), status: 'DELETED' } },
      { new: true }
    );
    return !!result;
  }

  /**
   * List projects with pagination
   */
  async list(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    filters?: { status?: string; ownerId?: string; tags?: string[] }
  ): Promise<{ projects: IProject[]; total: number; page: number; totalPages: number }> {
    const query: FilterQuery<IProjectDocument> = { companyId, deletedAt: null };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.ownerId) {
      query.ownerId = filters.ownerId;
    }
    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      ProjectModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProjectModel.countDocuments(query),
    ]);

    return {
      projects: toStringIds(projects) as unknown as IProject[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Count projects in a company
   */
  async countByCompanyId(companyId: string): Promise<number> {
    return ProjectModel.countDocuments({ companyId, deletedAt: null });
  }

  /**
   * Get project stats
   */
  async getStats(id: string): Promise<{
    fileCount: number;
    totalSize: number;
    vectorCount: number;
    memberCount: number;
  } | null> {
    const project = await this.findById(id);
    if (!project) {
      return null;
    }

    // Import ProjectMemberModel inline to avoid circular dependencies
    const { ProjectMemberModel } = await import('../models/project-member.model');

    const memberCount = await ProjectMemberModel.countDocuments({ projectId: id });

    return {
      fileCount: project.fileCount,
      totalSize: project.totalSize,
      vectorCount: project.vectorCount,
      memberCount,
    };
  }

  /**
   * Search projects by name or tags
   */
  async search(
    companyId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ projects: IProject[]; total: number; page: number; totalPages: number }> {
    const query: FilterQuery<IProjectDocument> = {
      companyId,
      deletedAt: null,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } },
      ],
    };

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      ProjectModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProjectModel.countDocuments(query),
    ]);

    return {
      projects: toStringIds(projects) as unknown as IProject[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

// Export singleton instance
export const projectRepository = new ProjectRepository();
