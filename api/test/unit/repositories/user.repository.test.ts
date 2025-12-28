import { userRepository } from '../../../src/repositories/user.repository';
import { UserModel } from '../../../src/models/user.model';
import { UserRole } from '@rag/types';
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

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await userRepository.hashPassword('mypassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
      expect(result).toBe('hashed_password');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await userRepository.verifyPassword('password', 'hash');

      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hash');
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await userRepository.verifyPassword('wrongpassword', 'hash');

      expect(result).toBe(false);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        companyId: new Types.ObjectId('5f8d04b3b54764421b7156c2'),
        email: 'test@example.com',
      };

      (UserModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userRepository.findById('5f8d04b3b54764421b7156c1');

      expect(result).toEqual(
        expect.objectContaining({
          email: 'test@example.com',
          _id: '5f8d04b3b54764421b7156c1',
        })
      );
    });

    it('should return null if user not found', async () => {
      (UserModel.findById as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await userRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email (case insensitive)', async () => {
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

    it('should return null if email not found', async () => {
      (UserModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByCompanyId', () => {
    it('should find users by company id', async () => {
      const mockUsers = [
        {
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          companyId: new Types.ObjectId('5f8d04b3b54764421b7156c2'),
          email: 'user1@example.com',
        },
        {
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c3'),
          companyId: new Types.ObjectId('5f8d04b3b54764421b7156c2'),
          email: 'user2@example.com',
        },
      ];

      (UserModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      const result = await userRepository.findByCompanyId('5f8d04b3b54764421b7156c2');

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('user1@example.com');
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const mockUpdatedUser = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        email: 'updated@example.com',
        firstName: 'Updated',
      };

      (UserModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUpdatedUser),
      });

      const result = await userRepository.update('5f8d04b3b54764421b7156c1', {
        firstName: 'Updated',
      });

      expect(result).toEqual(
        expect.objectContaining({
          firstName: 'Updated',
        })
      );
    });

    it('should return null if user not found', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await userRepository.update('non-existent', { firstName: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('should update password and reset login attempts', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: '123' });

      const result = await userRepository.updatePassword('user-123', 'newpassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            passwordHash: 'new_hashed_password',
            failedLoginAttempts: 0,
          }),
        })
      );
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.updatePassword('non-existent', 'newpassword');

      expect(result).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp and IP', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await userRepository.updateLastLogin('user-123', '192.168.1.1');

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            lastLoginIp: '192.168.1.1',
            failedLoginAttempts: 0,
          }),
        })
      );
    });
  });

  describe('incrementFailedLoginAttempts', () => {
    it('should increment failed login attempts', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        _id: 'user-123',
        failedLoginAttempts: 2,
      });
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await userRepository.incrementFailedLoginAttempts('user-123');

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            failedLoginAttempts: 3,
          }),
        })
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        _id: 'user-123',
        failedLoginAttempts: 4,
      });
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await userRepository.incrementFailedLoginAttempts('user-123');

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            failedLoginAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        })
      );
    });

    it('should do nothing if user not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      await userRepository.incrementFailedLoginAttempts('non-existent');

      expect(UserModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('isLocked', () => {
    it('should return true if user is locked', async () => {
      const futureDate = new Date(Date.now() + 1000000);
      (UserModel.findById as jest.Mock).mockResolvedValue({
        _id: 'user-123',
        lockedUntil: futureDate,
      });

      const result = await userRepository.isLocked('user-123');

      expect(result).toBe(true);
    });

    it('should return false if lock has expired', async () => {
      const pastDate = new Date(Date.now() - 1000000);
      (UserModel.findById as jest.Mock).mockResolvedValue({
        _id: 'user-123',
        lockedUntil: pastDate,
      });

      const result = await userRepository.isLocked('user-123');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.isLocked('non-existent');

      expect(result).toBe(false);
    });

    it('should return false if user has no lockedUntil', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        _id: 'user-123',
        lockedUntil: null,
      });

      const result = await userRepository.isLocked('user-123');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should soft delete user', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: 'user-123' });

      const result = await userRepository.delete('user-123');

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            isActive: false,
          }),
        }),
        expect.any(Object)
      );
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('setActive', () => {
    it('should activate user', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: 'user-123' });

      const result = await userRepository.setActive('user-123', true);

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          $set: { isActive: true },
        })
      );
      expect(result).toBe(true);
    });

    it('should deactivate user', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: 'user-123' });

      const result = await userRepository.setActive('user-123', false);

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          $set: { isActive: false },
        })
      );
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.setActive('non-existent', true);

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should list users with pagination', async () => {
      const mockUsers = [
        { _id: new Types.ObjectId(), email: 'user1@example.com' },
        { _id: new Types.ObjectId(), email: 'user2@example.com' },
      ];

      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });
      (UserModel.countDocuments as jest.Mock).mockResolvedValue(10);

      const result = await userRepository.list('company-123', 1, 10);

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by role', async () => {
      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      (UserModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await userRepository.list('company-123', 1, 10, { role: 'admin' });

      expect(UserModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        })
      );
    });

    it('should filter by isActive', async () => {
      (UserModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      (UserModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await userRepository.list('company-123', 1, 10, { isActive: true });

      expect(UserModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        })
      );
    });
  });

  describe('countByCompanyId', () => {
    it('should count users in company', async () => {
      (UserModel.countDocuments as jest.Mock).mockResolvedValue(5);

      const result = await userRepository.countByCompanyId('company-123');

      expect(UserModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-123',
          deletedAt: null,
        })
      );
      expect(result).toBe(5);
    });
  });
});
