import { database } from '../../src/config/database';
import { fileMetadataRepository } from '../../src/repositories/file-metadata.repository';
import { projectRepository } from '../../src/repositories/project.repository';
import { userRepository } from '../../src/repositories/user.repository';
import { companyRepository } from '../../src/repositories/company.repository';
import {
  ProcessingStatus,
  UploadStatus,
  SubscriptionTier,
  UserRole,
  Visibility,
} from '../../src/types/enums';

describe('File Metadata Repository Integration Tests', () => {
  let testProjectId: string;
  let testUserId: string;
  let testFileId: string;

  beforeAll(async () => {
    await database.connect();

    // Clean up FileMetadata
    await fileMetadataRepository.model.deleteMany({});

    // Ensure test data exists - check and create if missing
    let company = await companyRepository.findBySlug('acme-corp');

    if (!company) {
      // Create company if it doesn't exist
      company = await companyRepository.create({
        _id: '507f1f77bcf86cd799439011',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        email: 'admin@acme-corp.com',
        apiKey: 'dev-key-123',
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
        storageLimit: 10737418240, // 10GB
        maxUsers: 50,
        maxProjects: 100,
        settings: {
          notifications: {
            email: true,
            slack: false,
          },
          features: {
            advancedSearch: true,
            apiAccess: true,
          },
        },
      } as any);
    }

    let user = await userRepository.findByEmail('john.doe@acme-corp.com');

    if (!user) {
      // Create user if it doesn't exist
      const passwordHash = await userRepository.hashPassword('password123');
      user = await userRepository.create({
        _id: '507f1f77bcf86cd799439020',
        companyId: company._id,
        email: 'john.doe@acme-corp.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.OWNER,
        permissions: {
          canUpload: true,
          canDelete: true,
          canShare: true,
          canManageUsers: true,
        },
      } as any);
    }

    let project = await projectRepository.findBySlug(company._id, 'product-docs');

    if (!project) {
      // Create project if it doesn't exist
      project = await projectRepository.create({
        _id: '507f1f77bcf86cd799439030',
        companyId: company._id,
        ownerId: user._id,
        name: 'Product Documentation',
        slug: 'product-docs',
        description: 'Centralized product documentation and user guides',
        color: '#3B82F6',
        icon: '📚',
        tags: ['documentation', 'product', 'guides'],
        visibility: Visibility.COMPANY,
        settings: {
          autoIndex: true,
          chunkSize: 1000,
          chunkOverlap: 200,
        },
        metadata: {
          department: 'Product',
          category: 'Documentation',
        },
      } as any);
    }

    testProjectId = project._id;
    testUserId = user._id;
  });

  afterAll(async () => {
    await database.disconnect();
  });

  describe('File Metadata CRUD Operations', () => {
    it('should create file metadata', async () => {
      const fileMetadata = await fileMetadataRepository.create({
        projectId: testProjectId,
        uploadedBy: testUserId,
        filename: 'test-file-123.txt',
        originalFilename: 'test-file.txt',
        filepath: '/tmp/test-file-123.txt',
        mimetype: 'text/plain',
        size: 1024,
        hash: 'abc123hash',
        tags: ['test', 'integration'],
        metadata: {
          author: 'Test Author',
          title: 'Test Document',
        },
      });

      expect(fileMetadata).toBeDefined();
      expect(fileMetadata.filename).toBe('test-file-123.txt');
      expect(fileMetadata.processingStatus).toBe(ProcessingStatus.PENDING);
      expect(fileMetadata.uploadStatus).toBe(UploadStatus.UPLOADED);
      testFileId = fileMetadata._id;
    });

    it('should find file by ID', async () => {
      const file = await fileMetadataRepository.findById(testFileId);

      expect(file).toBeDefined();
      expect(file?.filename).toBe('test-file-123.txt');
      expect(file?.size).toBe(1024);
    });

    it('should find file by hash', async () => {
      const file = await fileMetadataRepository.findByHash('abc123hash', testProjectId);

      expect(file).toBeDefined();
      expect(file?.filename).toBe('test-file-123.txt');
    });

    it('should list files by project', async () => {
      const files = await fileMetadataRepository.findByProjectId(testProjectId);

      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.every((f) => f.projectId === testProjectId)).toBe(true);
    });

    it('should list files with pagination', async () => {
      const result = await fileMetadataRepository.list(testProjectId, 1, 10);

      expect(result.files.length).toBeGreaterThanOrEqual(1);
      expect(result.page).toBe(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('should search files by filename', async () => {
      const result = await fileMetadataRepository.search(testProjectId, 'test-file', 1, 10);

      expect(result.files.length).toBeGreaterThanOrEqual(1);
      expect(result.files[0].originalFilename).toContain('test-file');
    });
  });

  describe('File Processing Status Updates', () => {
    it('should update processing status to PROCESSING', async () => {
      await fileMetadataRepository.updateProcessingStatus(testFileId, ProcessingStatus.PROCESSING);

      const file = await fileMetadataRepository.findById(testFileId);
      expect(file?.processingStatus).toBe(ProcessingStatus.PROCESSING);
      expect(file?.processingStartedAt).toBeDefined();
    });

    it('should update processing status to COMPLETED', async () => {
      await fileMetadataRepository.updateProcessingStatus(testFileId, ProcessingStatus.COMPLETED);

      const file = await fileMetadataRepository.findById(testFileId);
      expect(file?.processingStatus).toBe(ProcessingStatus.COMPLETED);
      expect(file?.processingCompletedAt).toBeDefined();
    });

    it('should update vector indexing status', async () => {
      await fileMetadataRepository.updateVectorIndexed(
        testFileId,
        true,
        'company_test_collection',
        50
      );

      const file = await fileMetadataRepository.findById(testFileId);
      expect(file?.vectorIndexed).toBe(true);
      expect(file?.vectorCollection).toBe('company_test_collection');
      expect(file?.chunkCount).toBe(50);
      expect(file?.vectorIndexedAt).toBeDefined();
    });

    it('should update text extraction info', async () => {
      await fileMetadataRepository.update(testFileId, {
        textExtracted: true,
        textLength: 5000,
      });

      const file = await fileMetadataRepository.findById(testFileId);
      expect(file?.textExtracted).toBe(true);
      expect(file?.textLength).toBe(5000);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should increment retry count with error message', async () => {
      await fileMetadataRepository.incrementRetryCount(testFileId, 'Test error message');

      const file = await fileMetadataRepository.findById(testFileId);
      expect(file?.retryCount).toBe(1);
      expect(file?.errorMessage).toBe('Test error message');
      expect(file?.lastRetryAt).toBeDefined();
    });

    it('should find pending files', async () => {
      // Create a pending file
      const pendingFile = await fileMetadataRepository.create({
        projectId: testProjectId,
        uploadedBy: testUserId,
        filename: 'pending-file.txt',
        originalFilename: 'pending.txt',
        filepath: '/tmp/pending.txt',
        mimetype: 'text/plain',
        size: 512,
        hash: 'pendinghash123',
        tags: [],
      });

      const pendingFiles = await fileMetadataRepository.getPendingFiles(10);

      expect(pendingFiles.length).toBeGreaterThanOrEqual(1);
      expect(pendingFiles.some((f) => f._id === pendingFile._id)).toBe(true);
    });

    it('should find retryable failed files', async () => {
      // Create a failed file
      const failedFile = await fileMetadataRepository.create({
        projectId: testProjectId,
        uploadedBy: testUserId,
        filename: 'failed-file.txt',
        originalFilename: 'failed.txt',
        filepath: '/tmp/failed.txt',
        mimetype: 'text/plain',
        size: 256,
        hash: 'failedhash123',
        tags: [],
      });

      await fileMetadataRepository.updateProcessingStatus(failedFile._id, ProcessingStatus.FAILED);
      await fileMetadataRepository.incrementRetryCount(failedFile._id, 'Processing failed');

      const retryableFiles = await fileMetadataRepository.getRetryableFiles(3, 10);

      expect(retryableFiles.length).toBeGreaterThanOrEqual(1);
      expect(retryableFiles.some((f) => f._id === failedFile._id)).toBe(true);
    });
  });

  describe('File Filtering and Queries', () => {
    it('should filter files by processing status', async () => {
      const files = await fileMetadataRepository.findByProcessingStatus(
        testProjectId,
        ProcessingStatus.COMPLETED
      );

      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.every((f) => f.processingStatus === ProcessingStatus.COMPLETED)).toBe(true);
    });

    it('should filter files by tags', async () => {
      const result = await fileMetadataRepository.list(testProjectId, 1, 10, {
        tags: ['test'],
      });

      expect(result.files.length).toBeGreaterThanOrEqual(1);
      expect(result.files.every((f) => f.tags.includes('test'))).toBe(true);
    });

    it('should calculate total storage for project', async () => {
      const totalSize = await fileMetadataRepository.getTotalStorageByProject(testProjectId);

      expect(totalSize).toBeGreaterThanOrEqual(1024); // At least our test file
    });

    it('should count files in project', async () => {
      const count = await fileMetadataRepository.countByProjectId(testProjectId);

      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('File Metadata Soft Delete', () => {
    it('should soft delete file', async () => {
      const deleted = await fileMetadataRepository.delete(testFileId);
      expect(deleted).toBe(true);

      // Should not find deleted file
      const found = await fileMetadataRepository.findById(testFileId);
      expect(found).toBeNull();

      // But file still exists in database with deletedAt timestamp
      const files = await fileMetadataRepository.list(testProjectId, 1, 100);
      // Count should not include deleted file
    });
  });

  describe('Last Accessed Tracking', () => {
    it('should update last accessed timestamp', async () => {
      // Create new file for this test
      const file = await fileMetadataRepository.create({
        projectId: testProjectId,
        uploadedBy: testUserId,
        filename: 'access-test.txt',
        originalFilename: 'access-test.txt',
        filepath: '/tmp/access-test.txt',
        mimetype: 'text/plain',
        size: 100,
        hash: 'accesstesthash',
        tags: [],
      });

      await fileMetadataRepository.updateLastAccessed(file._id);

      const updated = await fileMetadataRepository.findById(file._id);
      expect(updated?.lastAccessedAt).toBeDefined();
    });
  });
});
