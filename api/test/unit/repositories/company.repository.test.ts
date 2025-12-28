import { companyRepository } from '../../../src/repositories/company.repository';
import { CompanyModel } from '../../../src/models/company.model';
import { UserModel } from '../../../src/models/user.model';
import { ProjectModel } from '../../../src/models/project.model';
import { FileMetadataModel } from '../../../src/models/file-metadata.model';
import { SubscriptionTier, CompanyStatus } from '@rag/types';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { CacheService } from '../../../src/services/cache.service';

// Mock Mongoose models
jest.mock('../../../src/models/company.model');
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/models/project.model');
jest.mock('../../../src/models/file-metadata.model');
jest.mock('bcryptjs');
jest.mock('../../../src/services/cache.service');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('CompanyRepository', () => {
  const mockDate = new Date('2023-01-01T00:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a company with API key', async () => {
      const mockData = {
        name: 'Test Company',
        email: 'test@example.com',
        slug: 'test-company',
        subscriptionTier: SubscriptionTier.FREE,
        storageLimit: 1073741824,
        maxUsers: 5,
        maxProjects: 10,
      };

      const mockSavedCompany = {
        ...mockData,
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        apiKey: 'ck_12345',
        apiKeyHash: 'hashed_key',
        status: CompanyStatus.ACTIVE,
        subscriptionTier: SubscriptionTier.FREE,
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
          apiKey: 'ck_12345',
          status: CompanyStatus.ACTIVE,
        }),
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_key');
      (CompanyModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedCompany),
      }));

      const result = await companyRepository.create(mockData);

      expect(result).toEqual(
        expect.objectContaining({
          name: mockData.name,
          apiKey: expect.stringMatching(/^ck_/),
        })
      );
      expect(CompanyModel).toHaveBeenCalled();
    });

    it('should use provided API key if supplied', async () => {
      const mockData = {
        name: 'Test Company',
        email: 'test@example.com',
        slug: 'test-company',
        subscriptionTier: SubscriptionTier.FREE,
        storageLimit: 1073741824,
        maxUsers: 5,
        maxProjects: 10,
        apiKey: 'ck_custom_key',
      };

      const mockSavedCompany = {
        ...mockData,
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        apiKeyHash: 'hashed_key',
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        }),
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_key');
      (CompanyModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedCompany),
      }));

      const result = await companyRepository.create(mockData);

      expect(result.apiKey).toBe('ck_custom_key');
    });
  });

  describe('findById', () => {
    it('should return company if found', async () => {
      const mockCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        name: 'Test Company',
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCompany),
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue(mockQuery);

      const result = await companyRepository.findById('5f8d04b3b54764421b7156c3');

      expect(result).toEqual(
        expect.objectContaining({
          name: 'Test Company',
          _id: '5f8d04b3b54764421b7156c3',
        })
      );
    });

    it('should return null if not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue(mockQuery);

      const result = await companyRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return company if found by slug', async () => {
      const mockCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        name: 'Test Company',
        slug: 'test-company',
      };

      (CompanyModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCompany),
      });

      const result = await companyRepository.findBySlug('test-company');

      expect(CompanyModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'test-company',
          deletedAt: null,
        })
      );
      expect(result?.slug).toBe('test-company');
    });

    it('should return null if slug not found', async () => {
      (CompanyModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await companyRepository.findBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByApiKey', () => {
    it('should return company if found by API key', async () => {
      const mockCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        apiKey: 'ck_valid_key',
      };

      (CompanyModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCompany),
      });

      const result = await companyRepository.findByApiKey('ck_valid_key');

      expect(result).toBeTruthy();
    });

    it('should return null if API key not found', async () => {
      (CompanyModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await companyRepository.findByApiKey('invalid_key');

      expect(result).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should return company and update last used timestamp if key is valid', async () => {
      const mockCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        apiKey: 'valid-key',
      };

      const mockFindOne = {
        lean: jest.fn().mockResolvedValue(mockCompany),
      };

      (CompanyModel.findOne as jest.Mock).mockReturnValue(mockFindOne);
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await companyRepository.validateApiKey('valid-key');

      expect(result).toBeTruthy();
      expect(CompanyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '5f8d04b3b54764421b7156c3',
        expect.objectContaining({
          apiKeyLastUsed: expect.any(Date),
        })
      );
    });

    it('should return null if API key is invalid', async () => {
      (CompanyModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await companyRepository.validateApiKey('invalid-key');

      expect(result).toBeNull();
      expect(CompanyModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update company', async () => {
      const mockUpdatedCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        name: 'Updated Company',
      };

      (CompanyModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUpdatedCompany),
      });

      const result = await companyRepository.update('5f8d04b3b54764421b7156c3', {
        name: 'Updated Company',
      });

      expect(result?.name).toBe('Updated Company');
    });

    it('should return null if company not found', async () => {
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await companyRepository.update('non-existent', { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete company', async () => {
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: 'company-123' });

      const result = await companyRepository.delete('company-123');

      expect(CompanyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'company-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
        expect.any(Object)
      );
      expect(result).toBe(true);
    });

    it('should return false if company not found', async () => {
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await companyRepository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('updateStorageUsed', () => {
    it('should increment storage used', async () => {
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await companyRepository.updateStorageUsed('company-123', 1024);

      expect(CompanyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'company-123',
        expect.objectContaining({
          $inc: { storageUsed: 1024 },
        })
      );
    });

    it('should decrement storage used with negative value', async () => {
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await companyRepository.updateStorageUsed('company-123', -512);

      expect(CompanyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'company-123',
        expect.objectContaining({
          $inc: { storageUsed: -512 },
        })
      );
    });
  });

  describe('hasReachedStorageLimit', () => {
    it('should return true if storage limit reached', async () => {
      const mockCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        storageUsed: 1073741824,
        storageLimit: 1073741824,
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCompany),
      });

      const result = await companyRepository.hasReachedStorageLimit('5f8d04b3b54764421b7156c3');

      expect(result).toBe(true);
    });

    it('should return false if storage limit not reached', async () => {
      const mockCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        storageUsed: 500000000,
        storageLimit: 1073741824,
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCompany),
      });

      const result = await companyRepository.hasReachedStorageLimit('5f8d04b3b54764421b7156c3');

      expect(result).toBe(false);
    });

    it('should return true if company not found', async () => {
      (CompanyModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await companyRepository.hasReachedStorageLimit('non-existent');

      expect(result).toBe(true);
    });
  });

  describe('list', () => {
    it('should list companies with pagination', async () => {
      const mockCompanies = [
        { _id: new Types.ObjectId(), name: 'Company 1' },
        { _id: new Types.ObjectId(), name: 'Company 2' },
      ];

      (CompanyModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCompanies),
      });
      (CompanyModel.countDocuments as jest.Mock).mockResolvedValue(20);

      const result = await companyRepository.list(1, 10);

      expect(result.companies).toHaveLength(2);
      expect(result.total).toBe(20);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by status', async () => {
      (CompanyModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      (CompanyModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await companyRepository.list(1, 10, { status: 'active' });

      expect(CompanyModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should filter by subscription tier', async () => {
      (CompanyModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      (CompanyModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await companyRepository.list(1, 10, { subscriptionTier: 'pro' });

      expect(CompanyModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionTier: 'pro',
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return company stats', async () => {
      const mockCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        storageUsed: 500000,
        storageLimit: 1073741824,
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCompany),
      });

      (ProjectModel.find as jest.Mock).mockReturnValue({
        distinct: jest.fn().mockResolvedValue(['project-1', 'project-2']),
      });

      (UserModel.countDocuments as jest.Mock).mockResolvedValue(5);
      (ProjectModel.countDocuments as jest.Mock).mockResolvedValue(2);
      (FileMetadataModel.aggregate as jest.Mock).mockResolvedValue([
        { fileCount: 10, totalSize: 1024000 },
      ]);
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await companyRepository.getStats('5f8d04b3b54764421b7156c3');

      expect(result).toEqual({
        userCount: 5,
        projectCount: 2,
        fileCount: 10,
        storageUsed: 1024000,
        storageLimit: 1073741824,
      });
    });

    it('should return null if company not found', async () => {
      (CompanyModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await companyRepository.getStats('non-existent');

      expect(result).toBeNull();
    });

    it('should handle empty file stats', async () => {
      const mockCompany = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
        storageUsed: 0,
        storageLimit: 1073741824,
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCompany),
      });

      (ProjectModel.find as jest.Mock).mockReturnValue({
        distinct: jest.fn().mockResolvedValue([]),
      });

      (UserModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (ProjectModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (FileMetadataModel.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await companyRepository.getStats('5f8d04b3b54764421b7156c3');

      expect(result?.fileCount).toBe(0);
      expect(result?.storageUsed).toBe(0);
    });
  });

  describe('iterateAll', () => {
    it('should iterate over all companies in batches', async () => {
      const batch1 = [
        { _id: new Types.ObjectId(), name: 'Company 1' },
        { _id: new Types.ObjectId(), name: 'Company 2' },
      ];
      const batch2 = [{ _id: new Types.ObjectId(), name: 'Company 3' }];

      let callCount = 0;
      (CompanyModel.find as jest.Mock).mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(batch1);
          if (callCount === 2) return Promise.resolve(batch2);
          return Promise.resolve([]);
        }),
      }));

      const results: unknown[][] = [];
      for await (const batch of companyRepository.iterateAll(2)) {
        results.push(batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(1);
    });

    it('should return empty when no companies exist', async () => {
      (CompanyModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const results: unknown[][] = [];
      for await (const batch of companyRepository.iterateAll(10)) {
        results.push(batch);
      }

      expect(results).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should invalidate API key cache when status changes', async () => {
      const companyId = '5f8d04b3b54764421b7156c3';
      const mockExistingCompany = {
        _id: new Types.ObjectId(companyId),
        apiKey: 'ck_existingkey',
        status: CompanyStatus.ACTIVE,
      };

      const mockUpdatedCompany = {
        _id: new Types.ObjectId(companyId),
        apiKey: 'ck_existingkey',
        status: CompanyStatus.SUSPENDED,
      };

      const mockFindByIdQuery = {
        where: jest.fn().mockResolvedValue(mockExistingCompany),
      };

      const mockUpdateQuery = {
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUpdatedCompany),
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue(mockFindByIdQuery);
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockUpdateQuery);
      (CacheService.invalidateApiKey as jest.Mock).mockResolvedValue(true);

      const result = await companyRepository.update(companyId, { status: CompanyStatus.SUSPENDED });

      expect(result).toBeTruthy();
      expect(CacheService.invalidateApiKey).toHaveBeenCalledWith('ck_existingkey');
    });

    it('should not invalidate cache when status is not changing', async () => {
      const companyId = '5f8d04b3b54764421b7156c3';
      const mockUpdatedCompany = {
        _id: new Types.ObjectId(companyId),
        name: 'Updated Name',
      };

      const mockUpdateQuery = {
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUpdatedCompany),
      };

      (CompanyModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockUpdateQuery);

      const result = await companyRepository.update(companyId, { name: 'Updated Name' });

      expect(result).toBeTruthy();
      expect(CacheService.invalidateApiKey).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should invalidate API key cache when company is soft-deleted', async () => {
      const companyId = '5f8d04b3b54764421b7156c3';
      const mockCompany = {
        _id: new Types.ObjectId(companyId),
        apiKey: 'ck_deletedkey',
        status: CompanyStatus.ACTIVE,
      };

      const mockFindByIdQuery = {
        where: jest.fn().mockResolvedValue(mockCompany),
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue(mockFindByIdQuery);
      (CompanyModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCompany);
      (CacheService.invalidateApiKey as jest.Mock).mockResolvedValue(true);

      const result = await companyRepository.delete(companyId);

      expect(result).toBe(true);
      expect(CacheService.invalidateApiKey).toHaveBeenCalledWith('ck_deletedkey');
    });

    it('should return false if company does not exist', async () => {
      const companyId = '5f8d04b3b54764421b7156c3';

      const mockFindByIdQuery = {
        where: jest.fn().mockResolvedValue(null),
      };

      (CompanyModel.findById as jest.Mock).mockReturnValue(mockFindByIdQuery);

      const result = await companyRepository.delete(companyId);

      expect(result).toBe(false);
      expect(CacheService.invalidateApiKey).not.toHaveBeenCalled();
    });
  });
});
