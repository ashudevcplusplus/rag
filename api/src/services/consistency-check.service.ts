import { VectorService } from './vector.service';
import { companyRepository } from '../repositories/company.repository';
import { projectRepository } from '../repositories/project.repository';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { embeddingRepository } from '../repositories/embedding.repository';
import { logger } from '../utils/logger';
import { consistencyCheckQueue } from '../queue/consistency-check.queue';
import { v4 as uuidv4 } from 'uuid';
import { ICompany } from '../schemas/company.schema';

export interface CompanyConsistencyReport {
  companyId: string;
  companyName: string;
  issues: string[];
  dbVectorCount: number;
  qdrantVectorCount: number;
  missingInQdrant: number;
  missingInDb: number;
  fileDiscrepancies: Array<{
    fileId: string;
    fileName: string;
    dbChunkCount: number;
    qdrantChunkCount: number;
  }>;
}

export class ConsistencyCheckService {
  /**
   * Check data consistency for a single company
   */
  static async checkCompany(companyId: string): Promise<CompanyConsistencyReport> {
    const company = await companyRepository.findById(companyId);
    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const issues: string[] = [];
    const fileDiscrepancies: Array<{
      fileId: string;
      fileName: string;
      dbChunkCount: number;
      qdrantChunkCount: number;
    }> = [];

    // Get all files for all projects
    const allFiles = await this.getCompanyFiles(companyId);

    // Get all embeddings from MongoDB
    let dbVectorCount = 0;
    const dbFileChunkCounts = new Map<string, number>();
    for (const file of allFiles) {
      const embedding = await embeddingRepository.findByFileId(file.fileId);
      if (embedding) {
        const chunkCount = embedding.chunkCount || 0;
        dbVectorCount += chunkCount;
        dbFileChunkCounts.set(file.fileId, chunkCount);
      } else {
        dbFileChunkCounts.set(file.fileId, 0);
      }
    }

    // Get collection info from Qdrant
    const collection = `company_${companyId}`;
    const collectionInfo = await VectorService.getCollectionInfo(collection);
    const qdrantVectorCount = collectionInfo?.pointsCount || 0;

    // Get Qdrant counts for known file IDs using indexed queries (efficient)
    const knownFileIds = allFiles.map((f) => f.fileId);
    const qdrantFileChunkCounts = await this.getQdrantFileCountsForKnownFiles(
      collection,
      knownFileIds
    );

    // Compare file-level counts
    for (const file of allFiles) {
      const dbCount = dbFileChunkCounts.get(file.fileId) || 0;
      const qdrantCount = qdrantFileChunkCounts.get(file.fileId) || 0;

      if (dbCount !== qdrantCount) {
        fileDiscrepancies.push({
          fileId: file.fileId,
          fileName: file.fileName,
          dbChunkCount: dbCount,
          qdrantChunkCount: qdrantCount,
        });
      }
    }

    // Check for orphaned files in Qdrant (files that don't exist in DB)
    const dbFileIds = new Set(knownFileIds);
    const qdrantFileIds = await this.getQdrantFileIds(collection);
    for (const fileId of qdrantFileIds) {
      if (!dbFileIds.has(fileId)) {
        // Get count for orphaned file
        const orphanCount = await VectorService.countByFileId(collection, fileId);
        issues.push(`File ${fileId} exists in Qdrant but not in DB (${orphanCount} chunks)`);
      }
    }

    // Calculate missing counts
    const missingInQdrant = Math.max(0, dbVectorCount - qdrantVectorCount);
    const missingInDb = Math.max(0, qdrantVectorCount - dbVectorCount);

    // Generate issues list
    if (dbVectorCount !== qdrantVectorCount) {
      issues.push(
        `Vector count mismatch: DB has ${dbVectorCount} vectors, Qdrant has ${qdrantVectorCount} vectors`
      );
    }

    if (fileDiscrepancies.length > 0) {
      issues.push(
        `${fileDiscrepancies.length} file(s) have chunk count mismatches between DB and Qdrant`
      );
    }

    if (missingInQdrant > 0) {
      issues.push(`Approximately ${missingInQdrant} vectors missing in Qdrant`);
    }

    if (missingInDb > 0) {
      issues.push(`Approximately ${missingInDb} vectors missing in DB`);
    }

    if (issues.length === 0) {
      issues.push('No discrepancies found - data is consistent');
    }

    logger.info('Company consistency check completed', {
      companyId,
      companyName: company.name,
      dbVectorCount,
      qdrantVectorCount,
      fileDiscrepancies: fileDiscrepancies.length,
      issues: issues.length,
    });

    return {
      companyId,
      companyName: company.name,
      issues,
      dbVectorCount,
      qdrantVectorCount,
      missingInQdrant,
      missingInDb,
      fileDiscrepancies,
    };
  }

  /**
   * Check data consistency for all companies
   */
  static async checkAllCompanies(): Promise<CompanyConsistencyReport[]> {
    return this.iterateAllCompanies<CompanyConsistencyReport>(
      'consistency check',
      async (company) => this.checkCompany(company._id),
      (company, error) => ({
        companyId: company._id,
        companyName: company.name,
        issues: [
          `Error checking company: ${error instanceof Error ? error.message : String(error)}`,
        ],
        dbVectorCount: 0,
        qdrantVectorCount: 0,
        missingInQdrant: 0,
        missingInDb: 0,
        fileDiscrepancies: [],
      })
    );
  }

  /**
   * Clean up orphaned vectors from Qdrant for a company
   * Deletes vectors that don't have corresponding file metadata in MongoDB
   */
  static async cleanupOrphanedVectors(companyId: string): Promise<{
    companyId: string;
    companyName: string;
    orphanedFiles: string[];
    vectorsDeleted: number;
    filesProcessed: number;
  }> {
    const company = await companyRepository.findById(companyId);
    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    logger.info('Starting orphaned vector cleanup', { companyId, companyName: company.name });

    // Get all files for all projects
    const allFiles = await this.getCompanyFiles(companyId);

    const dbFileIds = new Set(allFiles.map((f) => f.fileId));

    // Get unique file IDs from Qdrant (efficient scroll with only fileId payload)
    const collection = `company_${companyId}`;
    const qdrantFileIds = await this.getQdrantFileIds(collection);

    // Find orphaned file IDs (files in Qdrant but not in DB)
    const orphanedFiles: string[] = [];
    for (const fileId of qdrantFileIds) {
      if (!dbFileIds.has(fileId)) {
        orphanedFiles.push(fileId);
      }
    }

    let vectorsDeleted = 0;
    let filesProcessed = 0;

    logger.info('Found orphaned files in Qdrant', {
      companyId,
      orphanedFileCount: orphanedFiles.length,
    });

    // Delete vectors for each orphaned file
    for (const fileId of orphanedFiles) {
      try {
        // Get count before deletion (using indexed query)
        const fileVectorCount = await VectorService.countByFileId(collection, fileId);

        await VectorService.deleteByFileId(collection, fileId);
        filesProcessed++;
        vectorsDeleted += fileVectorCount;

        logger.debug('Deleted orphaned vectors for file', {
          companyId,
          fileId,
          vectorCount: fileVectorCount,
        });
      } catch (error) {
        logger.error('Failed to delete orphaned vectors for file', {
          companyId,
          fileId,
          error,
        });
        // Continue with other files even if one fails
      }
    }

    logger.info('Orphaned vector cleanup completed', {
      companyId,
      companyName: company.name,
      orphanedFiles: orphanedFiles.length,
      filesProcessed,
      vectorsDeleted,
    });

    return {
      companyId,
      companyName: company.name,
      orphanedFiles,
      vectorsDeleted,
      filesProcessed,
    };
  }

  /**
   * Clean up orphaned vectors for all companies
   */
  static async cleanupAllOrphanedVectors(): Promise<
    Array<{
      companyId: string;
      companyName: string;
      orphanedFiles: string[];
      vectorsDeleted: number;
      filesProcessed: number;
    }>
  > {
    return this.iterateAllCompanies(
      'orphaned vector cleanup',
      async (company) => this.cleanupOrphanedVectors(company._id),
      (company, _error) => ({
        companyId: company._id,
        companyName: company.name,
        orphanedFiles: [],
        vectorsDeleted: 0,
        filesProcessed: 0,
      })
    );
  }

  /**
   * Helper to get all files for a company
   */
  private static async getCompanyFiles(
    companyId: string
  ): Promise<Array<{ fileId: string; fileName: string; projectId: string }>> {
    const projects = await projectRepository.findByCompanyId(companyId);
    const allFiles: Array<{ fileId: string; fileName: string; projectId: string }> = [];
    for (const project of projects) {
      const files = await fileMetadataRepository.findByProjectId(project._id);
      for (const file of files) {
        allFiles.push({
          fileId: file._id,
          fileName: file.originalFilename,
          projectId: project._id,
        });
      }
    }
    return allFiles;
  }

  /**
   * Helper to get Qdrant file counts for known file IDs (uses indexed queries)
   * More efficient than scrolling through all points
   */
  private static async getQdrantFileCountsForKnownFiles(
    collection: string,
    fileIds: string[]
  ): Promise<Map<string, number>> {
    return VectorService.countByFileIds(collection, fileIds);
  }

  /**
   * Helper to get all unique file IDs from Qdrant (for orphan detection)
   */
  private static async getQdrantFileIds(collection: string): Promise<Set<string>> {
    return VectorService.getUniqueFileIds(collection);
  }

  /**
   * Helper to iterate over all companies with error handling
   * Uses cursor-based pagination to avoid memory pressure at scale
   */
  private static async iterateAllCompanies<T>(
    operationName: string,
    operation: (company: ICompany) => Promise<T>,
    errorResult: (company: ICompany, error: unknown) => T,
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = [];
    let totalProcessed = 0;

    logger.info(`Starting ${operationName} for all companies`);

    for await (const companyBatch of companyRepository.iterateAll(batchSize)) {
      logger.debug(`Processing batch of ${companyBatch.length} companies for ${operationName}`, {
        batchSize: companyBatch.length,
        totalProcessedSoFar: totalProcessed,
      });

      for (const company of companyBatch) {
        try {
          const result = await operation(company);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to ${operationName}`, {
            companyId: company._id,
            companyName: company.name,
            error,
          });
          results.push(errorResult(company, error));
        }
        totalProcessed++;
      }
    }

    logger.info(`Completed ${operationName} for all companies`, {
      totalCompanies: totalProcessed,
    });

    return results;
  }

  /**
   * Event Publisher Methods (merged from event-publisher.service.ts)
   */
  static async publishConsistencyCheck(companyId?: string): Promise<string> {
    logger.info('Publishing consistency check event', {
      companyId: companyId || 'all',
    });

    const job = await consistencyCheckQueue.add('consistency-check', {
      companyId,
      eventId: uuidv4(),
    });

    return job.id!;
  }

  static async publishCleanupOrphaned(
    companyId?: string,
    autoFix: boolean = false
  ): Promise<string> {
    logger.info('Publishing cleanup orphaned vectors event', {
      companyId: companyId || 'all',
      autoFix,
    });

    const job = await consistencyCheckQueue.add('cleanup-orphaned', {
      companyId,
      eventId: uuidv4(),
      autoFix,
    });

    return job.id!;
  }

  static async publishCheckAndFix(companyId?: string): Promise<string> {
    logger.info('Publishing check and fix event', {
      companyId: companyId || 'all',
    });

    const job = await consistencyCheckQueue.add('check-and-fix', {
      companyId,
      eventId: uuidv4(),
    });

    return job.id!;
  }
}
