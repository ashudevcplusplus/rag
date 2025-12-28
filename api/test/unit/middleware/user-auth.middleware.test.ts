import { Request, Response, NextFunction } from 'express';
import {
  authenticateUser,
  optionalAuthenticateUser,
  AuthenticatedUserRequest,
} from '../../../src/middleware/user-auth.middleware';
import { userRepository } from '../../../src/repositories/user.repository';
import { verifyToken } from '../../../src/utils/jwt.util';
import { UserRole } from '@rag/types';

// Mock dependencies
jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/utils/jwt.util');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('User Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockUser = {
    _id: 'user-123',
    companyId: 'company-456',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    isActive: true,
    firstName: 'Test',
    lastName: 'User',
  };

  const mockPayload = {
    userId: 'user-123',
    companyId: 'company-456',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid token', async () => {
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(verifyToken).toHaveBeenCalledWith('valid-token');
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedUserRequest).user).toEqual({
        ...mockPayload,
        isActive: true,
      });
    });

    it('should return 401 when no authorization header', async () => {
      delete mockRequest.headers!.authorization;

      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is not Bearer', async () => {
      mockRequest.headers!.authorization = 'Basic some-credentials';

      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is inactive', async () => {
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User account is inactive',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user company does not match route company', async () => {
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue({
        ...mockUser,
        companyId: 'different-company',
      });
      // getCompanyId looks in req.body.companyId, not req.params
      mockRequest.body = { companyId: 'company-456' };

      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User does not belong to this company',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access when no route company is specified', async () => {
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      mockRequest.params = {};

      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticateUser', () => {
    it('should continue without error when no authorization header', async () => {
      delete mockRequest.headers!.authorization;

      await optionalAuthenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without error when authorization is not Bearer', async () => {
      mockRequest.headers!.authorization = 'Basic some-credentials';

      await optionalAuthenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should authenticate when valid Bearer token provided', async () => {
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await optionalAuthenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedUserRequest).user).toBeDefined();
    });

    it('should return 401 when Bearer token is invalid', async () => {
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuthenticateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });
  });
});
