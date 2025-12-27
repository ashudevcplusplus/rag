import { ProjectModel, IProjectDocument } from '../models/project.model';
import { FileMetadataModel } from '../models/file-metadata.model';
import { EmbeddingModel } from '../models/embedding.model';
import { CreateProjectDTO, UpdateProjectDTO, IProject } from '../schemas/project.schema';
import { FilterQuery, Model, Types } from 'mongoose';
import { toStringId, toStringIds } from './helpers';

export class ProjectRepository {
  public model: Model<IProjectDocument>;

  constructor() {
    this.model = ProjectModel;
  }

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
   * Find project by ID including soft-deleted projects
   * Useful for seeding and administrative operations
   */
  async findByIdIncludingDeleted(id: string): Promise<IProject | null> {
    const project = await ProjectModel.findById(id).lean();
    if (!project) return null;
    return toStringId(project) as unknown as IProject;
  }

  /**
   * Find multiple projects by IDs (bulk fetch to avoid N+1 queries)
   */
  async findByIds(ids: string[]): Promise<IProject[]> {
    if (ids.length === 0) return [];
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const projects = await ProjectModel.find({
      _id: { $in: objectIds },
      deletedAt: null,
    }).lean();
    return toStringIds(projects) as unknown as IProject[];
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
   * Soft delete project (data access only - use DeletionService for full cascade delete)
   * @deprecated Use DeletionService.deleteProject() for cascading deletes with cleanup
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
   * Optionally calculates real-time stats from file metadata for accuracy
   */
  async list(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    filters?: { status?: string; ownerId?: string; tags?: string[]; syncStats?: boolean }
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
      ProjectModel.find(query)
        .select(
          'name description status fileCount totalSize vectorCount createdAt updatedAt tags color'
        ) // Only fetch needed fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProjectModel.countDocuments(query),
    ]);

    // If syncStats is requested, calculate and update actual stats from file metadata
    if (filters?.syncStats && projects.length > 0) {
      const projectIds = projects.map((p) => p._id);

      // Get actual file stats for all projects in one aggregation query
      const fileStats = await FileMetadataModel.aggregate([
        { $match: { projectId: { $in: projectIds }, deletedAt: null } },
        {
          $group: {
            _id: '$projectId',
            fileCount: { $sum: 1 },
            totalSize: { $sum: '$size' },
          },
        },
      ]);

      // Get actual vector counts from embeddings (excluding soft-deleted)
      const vectorStats = await EmbeddingModel.aggregate([
        {
          $match: {
            projectId: { $in: projectIds.map((id) => new Types.ObjectId(id.toString())) },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: '$projectId',
            vectorCount: { $sum: '$chunkCount' },
          },
        },
      ]);

      // Create lookup maps
      const fileStatsMap = new Map(fileStats.map((s) => [s._id.toString(), s]));
      const vectorStatsMap = new Map(vectorStats.map((s) => [s._id.toString(), s]));

      // Update projects with actual stats
      for (const project of projects) {
        const projectId = project._id.toString();
        const fStats = fileStatsMap.get(projectId);
        const vStats = vectorStatsMap.get(projectId);

        const actualFileCount = fStats?.fileCount ?? 0;
        const actualTotalSize = fStats?.totalSize ?? 0;
        const actualVectorCount = vStats?.vectorCount ?? 0;

        // Check if database needs sync before overwriting in-memory values
        const needsSync =
          project.fileCount !== actualFileCount ||
          project.totalSize !== actualTotalSize ||
          project.vectorCount !== actualVectorCount;

        // Update in-memory project object
        project.fileCount = actualFileCount;
        project.totalSize = actualTotalSize;
        project.vectorCount = actualVectorCount;

        // Sync to database if different (fire and forget)
        if (needsSync) {
          void ProjectModel.findByIdAndUpdate(project._id, {
            $set: {
              fileCount: actualFileCount,
              totalSize: actualTotalSize,
              vectorCount: actualVectorCount,
            },
          }).exec();
        }
      }
    }

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
  } | null> {
    const project = await this.findById(id);
    if (!project) {
      return null;
    }

    return {
      fileCount: project.fileCount,
      totalSize: project.totalSize,
      vectorCount: project.vectorCount,
    };
  }

  /**
   * Recalculate and sync project stats from actual file metadata
   */
  async recalculateStats(id: string): Promise<boolean> {
    const project = await this.findById(id);
    if (!project) {
      return false;
    }

    // Calculate actual file count and total size from file metadata
    const fileStats = await FileMetadataModel.aggregate([
      { $match: { projectId: new Types.ObjectId(id), deletedAt: null } },
      {
        $group: {
          _id: null,
          fileCount: { $sum: 1 },
          totalSize: { $sum: '$size' },
        },
      },
    ]);

    // Calculate actual vector count from embeddings (excluding soft-deleted)
    const vectorStats = await EmbeddingModel.aggregate([
      { $match: { projectId: new Types.ObjectId(id), deletedAt: null } },
      {
        $group: {
          _id: null,
          vectorCount: { $sum: '$chunkCount' },
        },
      },
    ]);

    const actualFileCount = fileStats.length > 0 ? fileStats[0].fileCount : 0;
    const actualTotalSize = fileStats.length > 0 ? fileStats[0].totalSize : 0;
    const actualVectorCount = vectorStats.length > 0 ? vectorStats[0].vectorCount : 0;

    // Update project with actual stats
    await ProjectModel.findByIdAndUpdate(id, {
      $set: {
        fileCount: actualFileCount,
        totalSize: actualTotalSize,
        vectorCount: actualVectorCount,
      },
    });

    return true;
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
      ProjectModel.find(query)
        .select(
          'name description status fileCount totalSize vectorCount createdAt updatedAt tags color'
        ) // Only fetch needed fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
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
