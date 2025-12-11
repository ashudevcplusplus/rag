import { FileService } from '../../../src/services/file.service';
import fs from 'fs';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { companyRepository } from '../../../src/repositories/company.repository';
import { indexingQueue } from '../../../src/queue/queue.client';
import { extractText } from '../../../src/utils/text-processor';
import { ValidationError } from '../../../src/types/error.types';

// Mock dependencies
jest.mock('fs');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/repositories/company.repository');
jest.mock('../../../src/queue/queue.client');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/async-events.util', () => ({
  publishFileCleanup: jest.fn().mockResolvedValue(undefined),
  publishProjectStats: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/utils/text-processor', () => ({
  extractText: jest.fn().mockResolvedValue('This is extracted text content from the file.'),
  chunkText: jest.fn().mockReturnValue(['chunk1', 'chunk2']),
  recursiveChunkText: jest.fn().mockReturnValue(['chunk1', 'chunk2']),
}));
jest.mock('../../../src/utils/hash.util', () => ({
  generateFileHash: jest.fn().mockReturnValue('mock-hash-12345'),
}));

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
      ...mockFile,
    });
    (fileMetadataRepository.update as jest.Mock).mockResolvedValue({});
    (indexingQueue.add as jest.Mock).mockResolvedValue({ id: 'job-123' });
    // Reset extractText mock to default successful behavior
    (extractText as jest.Mock).mockResolvedValue('This is extracted text content from the file.');
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
        jobId: 'job-123',
      });
      expect(fileMetadataRepository.create).toHaveBeenCalled();
      expect(indexingQueue.add).toHaveBeenCalled();
    });

    it('should throw error if duplicate file detected', async () => {
      // Mock finding existing file
      (fileMetadataRepository.findByHash as jest.Mock).mockResolvedValue({
        _id: 'existing-file-id',
        filename: 'test.txt',
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

    it('should throw error if file has no extractable text', async () => {
      (extractText as jest.Mock).mockResolvedValue('   '); // Only whitespace

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');

      // Verify cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      // Verify no file created
      expect(fileMetadataRepository.create).not.toHaveBeenCalled();
      expect(indexingQueue.add).not.toHaveBeenCalled();
    });

    it('should throw error if text extraction fails', async () => {
      (extractText as jest.Mock).mockRejectedValue(new Error('Unsupported file type'));

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('Unable to extract text from file');

      // Verify cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      // Verify no file created
      expect(fileMetadataRepository.create).not.toHaveBeenCalled();
      expect(indexingQueue.add).not.toHaveBeenCalled();
    });

    it('should handle file read errors gracefully', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File not found');
    });

    it('should handle text shorter than minimum length', async () => {
      (extractText as jest.Mock).mockResolvedValue('short'); // Less than 10 chars

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    it('should handle null extracted text', async () => {
      (extractText as jest.Mock).mockResolvedValue(null);

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    it('should handle undefined extracted text', async () => {
      (extractText as jest.Mock).mockResolvedValue(undefined);

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');
    });

    it('should handle file cleanup error after duplicate detection', async () => {
      (fileMetadataRepository.findByHash as jest.Mock).mockResolvedValue({
        _id: 'existing-file-id',
        filename: 'test.txt',
      });
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should still throw validation error even if cleanup fails
      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow(ValidationError);
    });

    it('should handle file cleanup error after text extraction failure', async () => {
      (extractText as jest.Mock).mockResolvedValue('   ');
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should still throw validation error even if cleanup fails
      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow(ValidationError);
    });

    it('should pass embedding provider and model to queue', async () => {
      const result = await fileService.uploadFile(
        'company-123',
        mockFile,
        'project-123',
        'user-123',
        'openai',
        'text-embedding-3-small'
      );

      expect(indexingQueue.add).toHaveBeenCalledWith(
        'index-file',
        expect.objectContaining({
          embeddingProvider: 'openai',
          embeddingModel: 'text-embedding-3-small',
        }),
        expect.any(Object)
      );
    });

    it('should update file metadata with job ID after queuing', async () => {
      await fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123');

      expect(fileMetadataRepository.update).toHaveBeenCalledWith(
        'new-file-id',
        expect.objectContaining({
          indexingJobId: 'job-123',
          processingStatus: expect.any(String),
        })
      );
    });

    it('should handle queue error', async () => {
      (indexingQueue.add as jest.Mock).mockRejectedValue(new Error('Queue connection failed'));

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('Queue connection failed');
    });

    it('should handle metadata creation error', async () => {
      (fileMetadataRepository.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('Database connection failed');
    });

    it('should calculate file size in MB correctly', async () => {
      const largeFile = {
        ...mockFile,
        size: 5 * 1024 * 1024, // 5MB
      };

      await fileService.uploadFile('company-123', largeFile, 'project-123', 'user-123');

      expect(indexingQueue.add).toHaveBeenCalledWith(
        'index-file',
        expect.objectContaining({
          fileSizeMB: 5,
        }),
        expect.any(Object)
      );
    });

    it('should handle text extraction returning empty string', async () => {
      (extractText as jest.Mock).mockResolvedValue('');

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');
    });

    it('should preserve ValidationError from text extraction', async () => {
      const originalError = new ValidationError('Custom validation error');
      (extractText as jest.Mock).mockRejectedValue(originalError);

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('Custom validation error');
    });
  });
});
