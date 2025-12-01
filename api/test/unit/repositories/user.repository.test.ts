import { userRepository } from '../../../src/repositories/user.repository';
import { UserModel } from '../../../src/models/user.model';
import { UserRole } from '../../../src/schemas/user.schema';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';

// Mock Mongoose model
jest.mock('../../../src/models/user.model');
jest.mock('bcryptjs');

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const mockData = {
        companyId: 'company-123',
        email: 'test@example.com',
        role: UserRole.MEMBER,
        passwordHash: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockSavedUser = {
        ...mockData,
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        companyId: new Types.ObjectId('5f8d04b3b54764421b7156c2'),
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          companyId: new Types.ObjectId('5f8d04b3b54764421b7156c2'),
        }),
      };

      (UserModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedUser),
      }));

      const result = await userRepository.create(mockData);

      expect(result).toEqual(
        expect.objectContaining({
          email: mockData.email,
          _id: '5f8d04b3b54764421b7156c1',
        })
      );
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        companyId: new Types.ObjectId('5f8d04b3b54764421b7156c2'),
        email: 'test@example.com',
      };

      (UserModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userRepository.findByEmail('TEST@EXAMPLE.COM');

      expect(UserModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      );
      expect(result).toEqual(
        expect.objectContaining({
          email: 'test@example.com',
          _id: '5f8d04b3b54764421b7156c1',
        })
      );
    });
  });
});
