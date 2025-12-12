import { FileService } from '../../../src/services/file.service';
import fs from 'fs';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import { companyRepository } from '../../../src/repositories/company.repository';
import { projectRepository } from '../../../src/repositories/project.repository';
import { indexingQueue } from '../../../src/queue/queue.client';
import { extractText } from '../../../src/utils/text-processor';
import { ValidationError } from '../../../src/types/error.types';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('fs');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/repositories/company.repository');
jest.mock('../../../src/repositories/project.repository');
jest.mock('../../../src/queue/queue.client');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/text-processor', () => ({
  extractText: jest.fn().mockResolvedValue('This is extracted text content from the file.'),
  chunkText: jest.fn().mockReturnValue(['chunk1', 'chunk2']),
  recursiveChunkText: jest.fn().mockReturnValue(['chunk1', 'chunk2']),
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
    (projectRepository.updateStats as jest.Mock).mockResolvedValue({});
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

    it('should handle empty string from text extraction', async () => {
      (extractText as jest.Mock).mockResolvedValue('');

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    it('should handle null from text extraction', async () => {
      (extractText as jest.Mock).mockResolvedValue(null);

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    it('should handle file read errors gracefully', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow();

      expect(fileMetadataRepository.create).not.toHaveBeenCalled();
    });

    it('should handle database create error', async () => {
      (fileMetadataRepository.create as jest.Mock).mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('Database connection lost');
    });

    it('should handle queue add failure', async () => {
      (indexingQueue.add as jest.Mock).mockRejectedValue(new Error('Redis connection refused'));

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('Redis connection refused');
    });

    it('should handle very large file content', async () => {
      const largeContent = 'x'.repeat(10000000); // 10MB of content
      (extractText as jest.Mock).mockResolvedValue(largeContent);

      const result = await fileService.uploadFile(
        'company-123',
        { ...mockFile, size: 10000000 },
        'project-123',
        'user-123'
      );

      expect(result.fileId).toBe('new-file-id');
    });

    it('should handle special characters in filename', async () => {
      const specialFile = {
        ...mockFile,
        originalname: 'test file (1) [copy].txt',
      };

      const result = await fileService.uploadFile(
        'company-123',
        specialFile,
        'project-123',
        'user-123'
      );

      expect(result.fileId).toBe('new-file-id');
    });

    it('should handle unicode in filename', async () => {
      const unicodeFile = {
        ...mockFile,
        originalname: '文档.txt',
      };

      const result = await fileService.uploadFile(
        'company-123',
        unicodeFile,
        'project-123',
        'user-123'
      );

      expect(result.fileId).toBe('new-file-id');
    });

    it('should handle cleanup failure gracefully', async () => {
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      (extractText as jest.Mock).mockResolvedValue('');

      // Should still throw the original error, not the cleanup error
      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');
    });

    it('should handle concurrent uploads for same file', async () => {
      // First call succeeds
      const result1 = await fileService.uploadFile(
        'company-123',
        mockFile,
        'project-123',
        'user-123'
      );

      // Second call finds duplicate
      (fileMetadataRepository.findByHash as jest.Mock).mockResolvedValue({
        _id: 'existing-file-id',
        filename: 'test.txt',
      });

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('edge cases', () => {
    it('should handle zero-size file', async () => {
      const zeroSizeFile = { ...mockFile, size: 0 };
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from(''));
      (extractText as jest.Mock).mockResolvedValue('');

      await expect(
        fileService.uploadFile('company-123', zeroSizeFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');
    });

    it('should handle PDF mimetype', async () => {
      const pdfFile = {
        ...mockFile,
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };

      const result = await fileService.uploadFile(
        'company-123',
        pdfFile,
        'project-123',
        'user-123'
      );

      expect(result.fileId).toBe('new-file-id');
    });

    it('should handle unknown mimetype', async () => {
      const unknownFile = {
        ...mockFile,
        mimetype: 'application/octet-stream',
      };

      const result = await fileService.uploadFile(
        'company-123',
        unknownFile,
        'project-123',
        'user-123'
      );

      expect(result.fileId).toBe('new-file-id');
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

    it('should calculate file size in MB correctly for queue job', async () => {
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

    it('should update file metadata with job ID after queuing', async () => {
      await fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123');

      expect(fileMetadataRepository.update).toHaveBeenCalledWith(
        'new-file-id',
        expect.objectContaining({
          indexingJobId: 'job-123',
        })
      );
    });

    it('should handle text shorter than minimum length', async () => {
      (extractText as jest.Mock).mockResolvedValue('short'); // Less than minimum

      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('File has no extractable text content');

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    it('should preserve original ValidationError from text extraction', async () => {
      const originalError = new ValidationError('Custom validation: Unsupported format');
      (extractText as jest.Mock).mockRejectedValue(originalError);

      // The original ValidationError should be preserved, not wrapped
      await expect(
        fileService.uploadFile('company-123', mockFile, 'project-123', 'user-123')
      ).rejects.toThrow('Custom validation: Unsupported format');

      // Note: ValidationError propagates directly, cleanup happens at a different layer
    });
  });
});
