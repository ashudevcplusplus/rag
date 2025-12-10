import { ProjectModel } from '../models/project.model';
import { FileMetadataModel } from '../models/file-metadata.model';
import { Types } from 'mongoose';
import { VectorService } from './vector.service';
import { CacheService } from './cache.service';
import { ConsistencyCheckService } from './consistency-check.service';
import { embeddingRepository } from '../repositories/embedding.repository';
import { logger } from '../utils/logger';

/**
 * Service responsible for orchestrating cascading delete operations.
 * This service coordinates deletions across multiple repositories and services
 * to avoid circular dependencies between repositories.
 */
export class DeletionService {
  /**
   * Delete a file with all associated resources (vectors, embeddings, cache)
   * @param fileId The ID of the file to delete
   * @returns true if the file was deleted, false if not found
   */
  static async deleteFile(fileId: string): Promise<boolean> {
    // Get file info before deleting
    const file = await FileMetadataModel.findById(fileId).lean();
    if (!file) {
      return false;
    }

    // Get project to find companyId for Qdrant cleanup
    const project = await ProjectModel.findById(file.projectId).where({ deletedAt: null }).lean();
    if (!project) {
      logger.warn('Project not found when deleting file', {
        fileId,
        projectId: file.projectId,
      });
    }

    // Delete vectors from Qdrant if file was indexed
    if (file.vectorIndexed && project && file._id) {
      try {
        const collection = `company_${project.companyId}`;
        await VectorService.deleteByFileId(collection, file._id.toString());

        // Also delete embeddings from MongoDB
        await embeddingRepository.deleteByFileId(file._id.toString());
      } catch (error) {
        // Log error but don't fail the deletion
        logger.error('Failed to delete vectors from Qdrant when deleting file', {
          fileId,
          error,
        });
      }
    }

    // Soft delete the file
    const result = await FileMetadataModel.findByIdAndUpdate(
      fileId,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    // Update project stats and trigger post-deletion cleanup
    if (result && project) {
      const statsUpdate: { fileCount: number; totalSize: number; vectorCount?: number } = {
        fileCount: -1,
        totalSize: -file.size,
      };

      // Decrement vector count if file was indexed
      if (file.chunkCount && file.chunkCount > 0) {
        statsUpdate.vectorCount = -file.chunkCount;
      }

      await ProjectModel.findByIdAndUpdate(file.projectId, { $inc: statsUpdate });

      // Trigger cache cleanup and consistency check
      if (project.companyId) {
        await this.triggerPostDeletionCleanup(project.companyId.toString(), { fileId }, 'file');
      }
    }

    return !!result;
  }

  /**
   * Delete a project with all associated resources (files, vectors, embeddings, cache)
   * @param projectId The ID of the project to delete
   * @returns true if the project was deleted, false if not found
   */
  static async deleteProject(projectId: string): Promise<boolean> {
    // Get project info before deleting
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) {
      return false;
    }

    // Get all files in the project
    const files = await FileMetadataModel.find({
      projectId: new Types.ObjectId(projectId),
      deletedAt: null,
    }).lean();
    const fileIds = files.map((f) => f._id.toString());

    // Delete all vectors from Qdrant for all files in the project
    if (fileIds.length > 0 && project.companyId) {
      try {
        const collection = `company_${project.companyId.toString()}`;
        await VectorService.deleteByProjectId(collection, projectId, fileIds);

        // Delete embeddings from MongoDB for all files
        for (const fileId of fileIds) {
          await embeddingRepository.deleteByFileId(fileId);
        }
      } catch (error) {
        // Log error but don't fail the deletion
        logger.error('Failed to delete vectors from Qdrant when deleting project', {
          projectId,
          fileCount: fileIds.length,
          error,
        });
      }
    }

    // Soft delete all files in the project
    if (fileIds.length > 0) {
      await FileMetadataModel.updateMany(
        { _id: { $in: fileIds.map((fid) => new Types.ObjectId(fid)) } },
        { $set: { deletedAt: new Date() } }
      );
    }

    // Soft delete the project
    const result = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set: { deletedAt: new Date(), status: 'DELETED' } },
      { new: true }
    );

    // Trigger cache cleanup and consistency check
    if (result && project.companyId) {
      await this.triggerPostDeletionCleanup(project.companyId.toString(), { projectId }, 'project');
    }

    return !!result;
  }

  /**
   * Trigger post-deletion cleanup (cache clearing and consistency check)
   */
  private static async triggerPostDeletionCleanup(
    companyId: string,
    context: { projectId?: string; fileId?: string },
    entityType: 'project' | 'file'
  ): Promise<void> {
    try {
      // Clear cache for the company
      await CacheService.clearCompany(companyId);
      logger.info(`Cache cleared after ${entityType} deletion`, { companyId, ...context });

      // Trigger consistency check event (async, don't wait)
      ConsistencyCheckService.publishConsistencyCheck(companyId).catch((error) => {
        logger.error(`Failed to trigger consistency check after ${entityType} deletion`, {
          companyId,
          ...context,
          error,
        });
      });
    } catch (error) {
      // Log error but don't fail the deletion
      logger.error('Failed to trigger post-deletion cleanup', {
        companyId,
        ...context,
        error,
      });
    }
  }
}
