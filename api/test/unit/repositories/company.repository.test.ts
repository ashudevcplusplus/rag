import { companyRepository } from '../../../src/repositories/company.repository';
import { CompanyModel } from '../../../src/models/company.model';
import { SubscriptionTier, CompanyStatus } from '../../../src/types/enums';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { CacheService } from '../../../src/services/cache.service';

// Mock Mongoose model
jest.mock('../../../src/models/company.model');
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
        storageLimit: 1073741824, // 1GB
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
