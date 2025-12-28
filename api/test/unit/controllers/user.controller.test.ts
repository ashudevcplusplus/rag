import { Request, Response } from 'express';
import {
  createUser,
  getUser,
  listUsers,
  updateUser,
  deleteUser,
  setUserActive,
} from '../../../src/controllers/user.controller';
import { userRepository } from '../../../src/repositories/user.repository';
import { companyRepository } from '../../../src/repositories/company.repository';
import {
  createMockResponse,
  createMockRequest,
  createMockUser,
  createMockCompany,
  createMockAuthenticatedRequest,
  MockExpressResponse,
} from '../../lib/mock-utils';

// Mock dependencies
jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/company.repository');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('UserController', () => {
  let mockRes: MockExpressResponse;
  const mockNext = jest.fn();

  const companyId = 'company-123';
  const userId = 'user-123';
  const mockCompany = createMockCompany({ _id: companyId });
  const mockUser = createMockUser(companyId, { _id: userId, email: 'test@example.com' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
  });

  describe('createUser', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        body: {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
        },
      });

      await createUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create user successfully when all data is valid', async () => {
      const createdUser = {
        ...mockUser,
        email: 'newuser@example.com',
        passwordHash: 'hashedpassword123',
      };
      (companyRepository.findById as jest.Mock).mockResolvedValue(mockCompany);
      (userRepository.countByCompanyId as jest.Mock).mockResolvedValue(1);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.hashPassword as jest.Mock).mockResolvedValue('hashedpassword123');
      (userRepository.create as jest.Mock).mockResolvedValue(createdUser);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        body: {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
        },
      });

      await createUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      // Flush promise queue since asyncHandler doesn't return the promise
      await new Promise(process.nextTick);

      // Check for any errors passed to next
      if (mockNext.mock.calls.length > 0) {
        // If next was called, log the error for debugging
        expect(mockNext).not.toHaveBeenCalled();
      }

      expect(userRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(userRepository.hashPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          companyId: companyId,
          passwordHash: 'hashedpassword123',
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.not.objectContaining({ passwordHash: expect.any(String) }),
        })
      );
    });

    it('should return 409 when email already exists', async () => {
      (companyRepository.findById as jest.Mock).mockResolvedValue(mockCompany);
      (userRepository.countByCompanyId as jest.Mock).mockResolvedValue(1);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        body: {
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      await createUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);
      // Flush promise queue since asyncHandler doesn't return the promise
      await new Promise(process.nextTick);

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const mockReq = createMockRequest({
        params: { userId },
      });

      await getUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.not.objectContaining({ passwordHash: expect.any(String) }),
        })
      );
    });

    it('should return 404 when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockRequest({
        params: { userId: 'non-existent' },
      });

      await getUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      (userRepository.list as jest.Mock).mockResolvedValue({
        users: [mockUser],
        total: 1,
        page: 1,
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        query: { page: '1', limit: '10' },
      });

      await listUsers(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(userRepository.list).toHaveBeenCalledWith(companyId, 1, 10, expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          users: expect.any(Array),
          pagination: expect.any(Object),
        })
      );
    });

    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        query: { page: '1', limit: '10' },
      });

      await listUsers(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should filter by role when provided', async () => {
      (userRepository.list as jest.Mock).mockResolvedValue({
        users: [mockUser],
        total: 1,
        page: 1,
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        query: { page: '1', limit: '10', role: 'admin' },
      });

      await listUsers(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(userRepository.list).toHaveBeenCalledWith(
        companyId,
        1,
        10,
        expect.objectContaining({ role: 'admin' })
      );
    });

    it('should filter by isActive when provided', async () => {
      (userRepository.list as jest.Mock).mockResolvedValue({
        users: [mockUser],
        total: 1,
        page: 1,
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        query: { page: '1', limit: '10', isActive: 'true' },
      });

      await listUsers(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(userRepository.list).toHaveBeenCalledWith(
        companyId,
        1,
        10,
        expect.objectContaining({ isActive: true })
      );
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      (userRepository.update as jest.Mock).mockResolvedValue(updatedUser);

      const mockReq = createMockRequest({
        params: { userId },
        body: { firstName: 'Updated' },
      });

      await updateUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(userRepository.update).toHaveBeenCalledWith(userId, { firstName: 'Updated' });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ firstName: 'Updated' }),
        })
      );
    });

    it('should return 404 when user not found', async () => {
      (userRepository.update as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockRequest({
        params: { userId: 'non-existent' },
        body: { firstName: 'Updated' },
      });

      await updateUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      (userRepository.delete as jest.Mock).mockResolvedValue(true);

      const mockReq = createMockRequest({
        params: { userId },
      });

      await deleteUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(userRepository.delete).toHaveBeenCalledWith(userId);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User deleted successfully',
        })
      );
    });

    it('should return 404 when user not found', async () => {
      (userRepository.delete as jest.Mock).mockResolvedValue(false);

      const mockReq = createMockRequest({
        params: { userId: 'non-existent' },
      });

      await deleteUser(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('setUserActive', () => {
    it('should activate user successfully', async () => {
      (userRepository.setActive as jest.Mock).mockResolvedValue(true);

      const mockReq = createMockRequest({
        params: { userId },
        body: { isActive: true },
      });

      await setUserActive(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(userRepository.setActive).toHaveBeenCalledWith(userId, true);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User activated successfully',
        })
      );
    });

    it('should deactivate user successfully', async () => {
      (userRepository.setActive as jest.Mock).mockResolvedValue(true);

      const mockReq = createMockRequest({
        params: { userId },
        body: { isActive: false },
      });

      await setUserActive(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(userRepository.setActive).toHaveBeenCalledWith(userId, false);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User deactivated successfully',
        })
      );
    });

    it('should return 400 when isActive is not a boolean', async () => {
      const mockReq = createMockRequest({
        params: { userId },
        body: { isActive: 'yes' },
      });

      await setUserActive(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when user not found', async () => {
      (userRepository.setActive as jest.Mock).mockResolvedValue(false);

      const mockReq = createMockRequest({
        params: { userId: 'non-existent' },
        body: { isActive: true },
      });

      await setUserActive(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
