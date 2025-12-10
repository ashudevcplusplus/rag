import { companyRepository } from '../../../src/repositories/company.repository';
import { CompanyModel } from '../../../src/models/company.model';
import { SubscriptionTier, CompanyStatus } from '../../../src/types/enums';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';

// Mock Mongoose model
jest.mock('../../../src/models/company.model');
jest.mock('bcryptjs');

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
});
