import { ConsistencyCheckService } from '../../../src/services/consistency-check.service';
import { companyRepository } from '../../../src/repositories/company.repository';
import { projectRepository } from '../../../src/repositories/project.repository';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { embeddingRepository } from '../../../src/repositories/embedding.repository';
import { VectorService } from '../../../src/services/vector.service';
import { consistencyCheckQueue } from '../../../src/queue/consistency-check.queue';

// Mock dependencies
jest.mock('../../../src/repositories/company.repository');
jest.mock('../../../src/repositories/project.repository');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/repositories/embedding.repository');
jest.mock('../../../src/services/vector.service');
jest.mock('../../../src/queue/consistency-check.queue');
jest.mock('../../../src/utils/logger');

describe('ConsistencyCheckService', () => {
  const mockCompanyId = 'company-123';
  const mockProjectId = 'project-123';
  const mockFileId = 'file-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default successful mocks
    (companyRepository.findById as jest.Mock).mockResolvedValue({
      _id: mockCompanyId,
      name: 'Test Company',
    });

    (projectRepository.findByCompanyId as jest.Mock).mockResolvedValue([{ _id: mockProjectId }]);

    (fileMetadataRepository.findByProjectId as jest.Mock).mockResolvedValue([
      { _id: mockFileId, originalFilename: 'test.txt' },
    ]);

    (embeddingRepository.findByFileId as jest.Mock).mockResolvedValue({
      fileId: mockFileId,
      chunkCount: 5,
    });

    (VectorService.getCollectionInfo as jest.Mock).mockResolvedValue({
      pointsCount: 5,
    });

    // Mock countByFileIds - returns a Map with file counts
    (VectorService.countByFileIds as jest.Mock).mockResolvedValue(new Map([[mockFileId, 5]]));

    // Mock getUniqueFileIds - returns a Set of file IDs in Qdrant
    (VectorService.getUniqueFileIds as jest.Mock).mockResolvedValue(new Set([mockFileId]));

    // Mock countByFileId - for counting individual file vectors
    (VectorService.countByFileId as jest.Mock).mockResolvedValue(1);

    (consistencyCheckQueue.add as jest.Mock).mockResolvedValue({ id: 'job-123' });
  });

  describe('checkCompany', () => {
    it('should report consistent state when counts match', async () => {
      const report = await ConsistencyCheckService.checkCompany(mockCompanyId);

      expect(report.dbVectorCount).toBe(5);
      expect(report.qdrantVectorCount).toBe(5);
      expect(report.fileDiscrepancies).toHaveLength(0);
      expect(report.issues).toContain('No discrepancies found - data is consistent');
    });

    it('should report discrepancy when DB has more vectors', async () => {
      // Mock DB having 10 vectors
      (embeddingRepository.findByFileId as jest.Mock).mockResolvedValue({
        fileId: mockFileId,
        chunkCount: 10,
      });

      // Mock Qdrant having 5 vectors for this file
      (VectorService.countByFileIds as jest.Mock).mockResolvedValue(new Map([[mockFileId, 5]]));

      const report = await ConsistencyCheckService.checkCompany(mockCompanyId);

      expect(report.dbVectorCount).toBe(10);
      expect(report.qdrantVectorCount).toBe(5);
      expect(report.missingInQdrant).toBe(5);
      expect(report.fileDiscrepancies).toHaveLength(1);
      expect(report.fileDiscrepancies[0]).toEqual({
        fileId: mockFileId,
        fileName: 'test.txt',
        dbChunkCount: 10,
        qdrantChunkCount: 5,
      });
    });

    it('should report discrepancy when Qdrant has more vectors', async () => {
      // Mock Qdrant having 10 vectors
      (VectorService.getCollectionInfo as jest.Mock).mockResolvedValue({
        pointsCount: 10,
      });
      (VectorService.countByFileIds as jest.Mock).mockResolvedValue(new Map([[mockFileId, 10]]));

      const report = await ConsistencyCheckService.checkCompany(mockCompanyId);

      expect(report.dbVectorCount).toBe(5);
      expect(report.qdrantVectorCount).toBe(10);
      expect(report.missingInDb).toBe(5);
      expect(report.fileDiscrepancies).toHaveLength(1);
    });

    it('should throw error if company not found', async () => {
      (companyRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(ConsistencyCheckService.checkCompany('invalid-id')).rejects.toThrow(
        'Company not found'
      );
    });
  });

  describe('cleanupOrphanedVectors', () => {
    it('should delete vectors for files not in DB', async () => {
      // Mock file in DB
      const validFileId = 'valid-file';
      (fileMetadataRepository.findByProjectId as jest.Mock).mockResolvedValue([
        { _id: validFileId },
      ]);

      // Mock getUniqueFileIds: one valid, one orphaned
      (VectorService.getUniqueFileIds as jest.Mock).mockResolvedValue(
        new Set([validFileId, 'orphaned-file'])
      );

      // Mock countByFileId for the orphaned file
      (VectorService.countByFileId as jest.Mock).mockResolvedValue(3);

      const result = await ConsistencyCheckService.cleanupOrphanedVectors(mockCompanyId);

      expect(result.orphanedFiles).toContain('orphaned-file');
      expect(result.vectorsDeleted).toBe(3);
      expect(VectorService.deleteByFileId).toHaveBeenCalledWith(
        expect.stringContaining(mockCompanyId),
        'orphaned-file'
      );
    });
  });

  describe('Event Publishing', () => {
    it('should publish consistency check event', async () => {
      const jobId = await ConsistencyCheckService.publishConsistencyCheck(mockCompanyId);

      expect(jobId).toBe('job-123');
      expect(consistencyCheckQueue.add).toHaveBeenCalledWith(
        'consistency-check',
        expect.objectContaining({ companyId: mockCompanyId })
      );
    });

    it('should publish cleanup orphaned event', async () => {
      const jobId = await ConsistencyCheckService.publishCleanupOrphaned(mockCompanyId);

      expect(jobId).toBe('job-123');
      expect(consistencyCheckQueue.add).toHaveBeenCalledWith(
        'cleanup-orphaned',
        expect.objectContaining({ companyId: mockCompanyId })
      );
    });

    it('should publish check and fix event', async () => {
      const jobId = await ConsistencyCheckService.publishCheckAndFix(mockCompanyId);

      expect(jobId).toBe('job-123');
      expect(consistencyCheckQueue.add).toHaveBeenCalledWith(
        'check-and-fix',
        expect.objectContaining({ companyId: mockCompanyId })
      );
    });
  });
});
