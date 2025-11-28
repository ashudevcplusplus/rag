import { FileService } from '../../../src/services/file.service';
import fs from 'fs';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { companyRepository } from '../../../src/repositories/company.repository';
import { indexingQueue } from '../../../src/queue/queue.client';
import { ValidationError } from '../../../src/types/error.types';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('fs');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/repositories/company.repository');
jest.mock('../../../src/queue/queue.client');
jest.mock('../../../src/utils/logger');

describe('FileService', () => {
  let fileService: FileService;
  const mockFile = {
    path: '/tmp/test-file',
    originalname: 'test.txt',
    mimetype: 'text/plain',
    size: 1024,
    filename: 'test-file-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fileService = new FileService();
    
    // Default successful mocks
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test content'));
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (companyRepository.hasReachedStorageLimit as jest.Mock).mockResolvedValue(false);
    (fileMetadataRepository.findByHash as jest.Mock).mockResolvedValue(null);
    (fileMetadataRepository.create as jest.Mock).mockResolvedValue({
      _id: 'new-file-id',
      ...mockFile
    });
    (fileMetadataRepository.update as jest.Mock).mockResolvedValue({});
    (indexingQueue.add as jest.Mock).mockResolvedValue({ id: 'job-123' });
  });

  describe('uploadFile', () => {
    it('should upload and queue file successfully', async () => {
      const result = await fileService.uploadFile(
        'company-123',
        mockFile,
        'project-123',
        'user-123'
      );

      expect(result).toEqual({
        fileId: 'new-file-id',
        jobId: 'job-123'
      });
      expect(fileMetadataRepository.create).toHaveBeenCalled();
      expect(indexingQueue.add).toHaveBeenCalled();
    });

    it('should throw error if duplicate file detected', async () => {
      // Mock finding existing file
      (fileMetadataRepository.findByHash as jest.Mock).mockResolvedValue({
        _id: 'existing-file-id',
        filename: 'test.txt'
      });

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow(ValidationError);

      // Verify cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      // Verify no new file created
      expect(fileMetadataRepository.create).not.toHaveBeenCalled();
      expect(indexingQueue.add).not.toHaveBeenCalled();
    });

    it('should throw error if storage limit reached', async () => {
      (companyRepository.hasReachedStorageLimit as jest.Mock).mockResolvedValue(true);
      (companyRepository.findById as jest.Mock).mockResolvedValue({ storageUsed: 1000 });

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('Storage limit reached');

      expect(fileMetadataRepository.create).not.toHaveBeenCalled();
    });
  });
});

