import { Request, Response, NextFunction } from 'express';
import { publicLogin } from '../../../src/controllers/auth.controller';
import { userRepository } from '../../../src/repositories/user.repository';
import { companyRepository } from '../../../src/repositories/company.repository';
import { createMockResponse, createMockRequest } from '../../lib/mock-utils';
import { UserRole, CompanyStatus, SubscriptionTier } from '@rag/types';

// Mock dependencies
jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/company.repository');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../../src/utils/jwt.util', () => ({
  generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
}));

describe('AuthController', () => {
  let mockRes: ReturnType<typeof createMockResponse>;
  let mockNext: NextFunction;

  const mockCompany = {
    _id: 'company-123',
    name: 'Test Company',
    slug: 'test-company',
    email: 'company@example.com',
    subscriptionTier: SubscriptionTier.PROFESSIONAL,
    storageLimit: 5368709120,
    storageUsed: 0,
    maxUsers: 4,
    maxProjects: 10,
    status: CompanyStatus.ACTIVE,
    apiKey: 'valid-key-123',
    apiKeyHash: 'hashed-key',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    _id: 'user-123',
    companyId: 'company-123',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.ADMIN,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    mockNext = jest.fn();
  });

  describe('publicLogin', () => {
    it('should successfully login with valid credentials', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (companyRepository.findById as jest.Mock).mockResolvedValue(mockCompany);
      (userRepository.isLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.verifyPassword as jest.Mock).mockResolvedValue(true);
      (userRepository.updateLastLogin as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      // Flush promise queue since asyncHandler doesn't return the promise
      await new Promise(process.nextTick);

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(companyRepository.findById).toHaveBeenCalledWith('company-123');
      expect(userRepository.verifyPassword).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(userRepository.updateLastLogin).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: 'mock-jwt-token',
          user: expect.objectContaining({
            _id: 'user-123',
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should return 400 for invalid email format', async () => {
      const mockReq = createMockRequest({
        body: {
          email: 'invalid-email',
          password: 'password123',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('email'),
        })
      );
    });

    it('should return 400 for missing password', async () => {
      const mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 for non-existent user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockRequest({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid email or password',
      });
    });

    it('should return 401 when company not found', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (companyRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Company not found',
      });
    });

    it('should return 401 when company is not active', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (companyRepository.findById as jest.Mock).mockResolvedValue({
        ...mockCompany,
        status: CompanyStatus.SUSPENDED,
      });

      const mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Company account is not active',
      });
    });

    it('should return 401 when user is inactive', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (companyRepository.findById as jest.Mock).mockResolvedValue(mockCompany);

      const mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User account is inactive',
      });
    });

    it('should return 401 when account is locked', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (companyRepository.findById as jest.Mock).mockResolvedValue(mockCompany);
      (userRepository.isLocked as jest.Mock).mockResolvedValue(true);

      const mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Account is locked due to too many failed login attempts',
      });
    });

    it('should return 401 and increment failed attempts on wrong password', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (companyRepository.findById as jest.Mock).mockResolvedValue(mockCompany);
      (userRepository.isLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.verifyPassword as jest.Mock).mockResolvedValue(false);
      (userRepository.incrementFailedLoginAttempts as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid email or password',
      });
    });

    it('should remove password hash from response', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (companyRepository.findById as jest.Mock).mockResolvedValue(mockCompany);
      (userRepository.isLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.verifyPassword as jest.Mock).mockResolvedValue(true);
      (userRepository.updateLastLogin as jest.Mock).mockResolvedValue(undefined);

      const mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await publicLogin(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      await new Promise(process.nextTick);

      const responseCall = mockRes.json.mock.calls[0][0];
      expect(responseCall.user.passwordHash).toBeUndefined();
    });
  });
});
