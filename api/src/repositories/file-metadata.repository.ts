import { FileMetadataModel, IFileMetadataDocument } from '../models/file-metadata.model';
import {
  CreateFileMetadataDTO,
  UpdateFileMetadataDTO,
  IFileMetadata,
  ProcessingStatus,
} from '../schemas/file-metadata.schema';
import { FilterQuery, UpdateQuery, Types, Model } from 'mongoose';
import { toStringId, toStringIds } from './helpers';

export class FileMetadataRepository {
  public model: Model<IFileMetadataDocument>;

  constructor() {
    this.model = FileMetadataModel;
  }

  /**
   * Create new file metadata
   */
  async create(data: CreateFileMetadataDTO): Promise<IFileMetadata> {
    const fileMetadata = new FileMetadataModel(data);
    const saved = await fileMetadata.save();
    return toStringId(saved.toObject()) as unknown as IFileMetadata;
  }

  /**
   * Find file by ID
   */
  async findById(id: string): Promise<IFileMetadata | null> {
    const file = await FileMetadataModel.findById(id).where({ deletedAt: null }).lean();
    if (!file) return null;
    return toStringId(file) as unknown as IFileMetadata;
  }

  /**
   * Find file by hash (for deduplication)
   */
  async findByHash(hash: string, projectId: string): Promise<IFileMetadata | null> {
    const file = await FileMetadataModel.findOne({ hash, projectId, deletedAt: null }).lean();
    if (!file) return null;
    return toStringId(file) as unknown as IFileMetadata;
  }

  /**
   * Find files by project ID
   */
  async findByProjectId(projectId: string): Promise<IFileMetadata[]> {
    const files = await FileMetadataModel.find({ projectId, deletedAt: null })
      .sort({ uploadedAt: -1 })
      .lean();
    return toStringIds(files) as unknown as IFileMetadata[];
  }

  /**
   * Find files by uploader ID
   */
  async findByUploadedBy(uploadedBy: string): Promise<IFileMetadata[]> {
    const files = await FileMetadataModel.find({ uploadedBy, deletedAt: null })
      .sort({ uploadedAt: -1 })
      .lean();
    return toStringIds(files) as unknown as IFileMetadata[];
  }

  /**
   * Find files by processing status
   */
  async findByProcessingStatus(
    projectId: string,
    status: ProcessingStatus
  ): Promise<IFileMetadata[]> {
    const files = await FileMetadataModel.find({
      projectId,
      processingStatus: status,
      deletedAt: null,
    })
      .sort({ uploadedAt: -1 })
      .lean();
    return toStringIds(files) as unknown as IFileMetadata[];
  }

  /**
   * Update file metadata
   */
  async update(id: string, data: UpdateFileMetadataDTO): Promise<IFileMetadata | null> {
    const file = await FileMetadataModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .where({ deletedAt: null })
      .lean();

    if (!file) return null;
    return toStringId(file) as unknown as IFileMetadata;
  }

  /**
   * Update processing status
   */
  async updateProcessingStatus(id: string, status: ProcessingStatus): Promise<void> {
    const updates: UpdateQuery<IFileMetadataDocument> = { processingStatus: status };

    if (status === ProcessingStatus.PROCESSING) {
      updates.processingStartedAt = new Date();
    } else if (status === ProcessingStatus.COMPLETED) {
      updates.processingCompletedAt = new Date();
    }

    await FileMetadataModel.findByIdAndUpdate(id, { $set: updates });
  }

  /**
   * Update vector indexing status
   */
  async updateVectorIndexed(
    id: string,
    vectorIndexed: boolean,
    vectorCollection?: string,
    chunkCount?: number
  ): Promise<void> {
    const updates: UpdateQuery<IFileMetadataDocument> = {
      vectorIndexed,
      vectorIndexedAt: new Date(),
    };

    if (vectorCollection) {
      updates.vectorCollection = vectorCollection;
    }
    if (chunkCount !== undefined) {
      updates.chunkCount = chunkCount;
    }

    await FileMetadataModel.findByIdAndUpdate(id, { $set: updates });
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(id: string): Promise<void> {
    await FileMetadataModel.findByIdAndUpdate(id, {
      $set: { lastAccessedAt: new Date() },
    });
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(id: string, errorMessage?: string): Promise<void> {
    const updates: UpdateQuery<IFileMetadataDocument> = {
      $inc: { retryCount: 1 },
      $set: { lastRetryAt: new Date() },
    };

    if (errorMessage) {
      if (!updates.$set) updates.$set = {};
      updates.$set.errorMessage = errorMessage;
    }

    await FileMetadataModel.findByIdAndUpdate(id, updates);
  }

  /**
   * Soft delete file
   */
  async delete(id: string): Promise<boolean> {
    // Get file info before deleting to update project stats
    const file = await FileMetadataModel.findById(id).lean();
    if (!file) {
      return false;
    }

    const result = await FileMetadataModel.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    // Update project stats (decrement file count, total size, and vector count)
    if (result) {
      const { projectRepository } = await import('./project.repository');
      const statsUpdate: { fileCount: number; totalSize: number; vectorCount?: number } = {
        fileCount: -1,
        totalSize: -file.size,
      };

      // Decrement vector count if file was indexed
      if (file.chunkCount && file.chunkCount > 0) {
        statsUpdate.vectorCount = -file.chunkCount;
      }

      await projectRepository.updateStats(file.projectId.toString(), statsUpdate);
    }

    return !!result;
  }

  /**
   * List files with pagination
   */
  async list(
    projectId: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      processingStatus?: ProcessingStatus;
      mimetype?: string;
      tags?: string[];
    }
  ): Promise<{ files: IFileMetadata[]; total: number; page: number; totalPages: number }> {
    const query: FilterQuery<IFileMetadataDocument> = { projectId, deletedAt: null };

    if (filters?.processingStatus) {
      query.processingStatus = filters.processingStatus;
    }
    if (filters?.mimetype) {
      query.mimetype = filters.mimetype;
    }
    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      FileMetadataModel.find(query).sort({ uploadedAt: -1 }).skip(skip).limit(limit).lean(),
      FileMetadataModel.countDocuments(query),
    ]);

    return {
      files: toStringIds(files) as unknown as IFileMetadata[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get total storage used by project
   */
  async getTotalStorageByProject(projectId: string): Promise<number> {
    const result = await FileMetadataModel.aggregate([
      { $match: { projectId: new Types.ObjectId(projectId), deletedAt: null } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } },
    ]);

    return result.length > 0 ? result[0].totalSize : 0;
  }

  /**
   * Count files in a project
   */
  async countByProjectId(projectId: string): Promise<number> {
    return FileMetadataModel.countDocuments({ projectId, deletedAt: null });
  }

  /**
   * Search files by filename
   */
  async search(
    projectId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ files: IFileMetadata[]; total: number; page: number; totalPages: number }> {
    const query: FilterQuery<IFileMetadataDocument> = {
      projectId,
      deletedAt: null,
      $or: [
        { originalFilename: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } },
      ],
    };

    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      FileMetadataModel.find(query).sort({ uploadedAt: -1 }).skip(skip).limit(limit).lean(),
      FileMetadataModel.countDocuments(query),
    ]);

    return {
      files: toStringIds(files) as unknown as IFileMetadata[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get files pending processing
   */
  async getPendingFiles(limit: number = 10): Promise<IFileMetadata[]> {
    const files = await FileMetadataModel.find({
      processingStatus: ProcessingStatus.PENDING,
      deletedAt: null,
    })
      .sort({ uploadedAt: 1 })
      .limit(limit)
      .lean();

    return toStringIds(files) as unknown as IFileMetadata[];
  }

  /**
   * Get failed files that can be retried
   */
  async getRetryableFiles(maxRetries: number = 3, limit: number = 10): Promise<IFileMetadata[]> {
    const files = await FileMetadataModel.find({
      processingStatus: ProcessingStatus.FAILED,
      retryCount: { $lt: maxRetries },
      deletedAt: null,
    })
      .sort({ lastRetryAt: 1 })
      .limit(limit)
      .lean();

    return toStringIds(files) as unknown as IFileMetadata[];
  }
}

// Export singleton instance
export const fileMetadataRepository = new FileMetadataRepository();
