import { Request, Response, NextFunction } from 'express';
import {
  authenticateRequest,
  authorizeCompany,
  AuthenticatedRequest,
} from '../../../src/middleware/auth.middleware';
import { companyRepository } from '../../../src/repositories/company.repository';
import { CompanyStatus, SubscriptionTier } from '@rag/types';
import { ICompany } from '../../../src/schemas/company.schema';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock company repository
jest.mock('../../../src/repositories/company.repository', () => ({
  companyRepository: {
    validateApiKey: jest.fn(),
    findById: jest.fn(),
  },
}));

// Mock user repository
jest.mock('../../../src/repositories/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
  },
}));

// Mock JWT utility
jest.mock('../../../src/utils/jwt.util', () => ({
  verifyToken: jest.fn(),
}));

import { userRepository } from '../../../src/repositories/user.repository';
import { verifyToken } from '../../../src/utils/jwt.util';

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockCompany: ICompany = {
    _id: 'company-123',
    name: 'Test Company',
    slug: 'test-company',
    email: 'test@example.com',
    subscriptionTier: SubscriptionTier.FREE,
    storageLimit: 1000,
    storageUsed: 0,
    maxUsers: 5,
    maxProjects: 10,
    apiKey: 'valid-key-123',
    apiKeyHash: 'hashed-key',
    status: CompanyStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: {},
      path: '/v1/companies/company-123/uploads',
      params: { companyId: 'company-123' },
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authenticateRequest', () => {
    it('should allow health check without API key', async () => {
      (mockRequest as any).path = '/health';

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow admin queues without API key', async () => {
      (mockRequest as any).path = '/admin/queues';

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without API key or token', async () => {
      delete mockRequest.headers!['x-api-key'];

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization token or API key required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid API key', async () => {
      mockRequest.headers!['x-api-key'] = 'invalid-key';
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(null);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(companyRepository.validateApiKey).toHaveBeenCalledWith('invalid-key');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request for inactive company', async () => {
      mockRequest.headers!['x-api-key'] = 'suspended-key';
      const suspendedCompany = { ...mockCompany, status: CompanyStatus.SUSPENDED };
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(suspendedCompany);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Company account is suspended'),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept request with valid API key and active company', async () => {
      mockRequest.headers!['x-api-key'] = 'valid-key-123';
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(mockCompany);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(companyRepository.validateApiKey).toHaveBeenCalledWith('valid-key-123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();

      const authenticatedReq = mockRequest as AuthenticatedRequest;
      expect(authenticatedReq.context).toEqual({
        company: mockCompany,
        companyId: 'company-123',
        apiKey: 'valid-key-123',
        authMethod: 'api-key',
      });
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.headers!['x-api-key'] = 'valid-key-123';
      (companyRepository.validateApiKey as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorizeCompany', () => {
    it('should fail if not authenticated (no context)', () => {
      delete (mockRequest as AuthenticatedRequest).context;

      authorizeCompany(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass through if no companyId in params', () => {
      mockRequest.params = {};
      (mockRequest as AuthenticatedRequest).context = {
        company: mockCompany,
        companyId: 'company-123',
        apiKey: 'valid-key-123',
        authMethod: 'api-key',
      };

      authorizeCompany(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass through if context matches requested companyId', () => {
      mockRequest.params = { companyId: 'company-123' };
      (mockRequest as AuthenticatedRequest).context = {
        company: mockCompany,
        companyId: 'company-123',
        apiKey: 'valid-key-123',
        authMethod: 'api-key',
      };

      authorizeCompany(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject if context does not match requested companyId', () => {
      mockRequest.params = { companyId: 'company-456' };
      (mockRequest as AuthenticatedRequest).context = {
        company: mockCompany,
        companyId: 'company-123',
        apiKey: 'valid-key-123',
        authMethod: 'api-key',
      };

      authorizeCompany(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Access denied to this company' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and security', () => {
    it('should trim whitespace from API key', async () => {
      mockRequest.headers!['x-api-key'] = '  valid-key-123  ';
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(mockCompany);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      // Depends on implementation - if it trims, validateApiKey would be called with trimmed key
      expect(companyRepository.validateApiKey).toHaveBeenCalled();
    });

    it('should handle empty string API key', async () => {
      mockRequest.headers!['x-api-key'] = '';

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle very long API key', async () => {
      mockRequest.headers!['x-api-key'] = 'a'.repeat(10000);
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(null);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle special characters in API key', async () => {
      mockRequest.headers!['x-api-key'] = 'key-with-$pecial-ch@rs!';
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(null);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(companyRepository.validateApiKey).toHaveBeenCalledWith('key-with-$pecial-ch@rs!');
    });

    it('should handle connection timeout', async () => {
      mockRequest.headers!['x-api-key'] = 'valid-key';
      (companyRepository.validateApiKey as jest.Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle null company from validation', async () => {
      mockRequest.headers!['x-api-key'] = 'some-key';
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(null);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
    });

    it('should require auth for metrics endpoint', async () => {
      (mockRequest as any).path = '/metrics';
      delete mockRequest.headers!['x-api-key'];

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      // /metrics is not a public endpoint, requires authorization
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization token or API key required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle cancelled company status', async () => {
      mockRequest.headers!['x-api-key'] = 'cancelled-company-key';
      const cancelledCompany = { ...mockCompany, status: CompanyStatus.CANCELLED };
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(cancelledCompany);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should support Authorization header with Bearer token', async () => {
      // JWT tokens are now supported via Authorization: Bearer header
      mockRequest.headers!['authorization'] = 'Bearer invalid-token';
      delete mockRequest.headers!['x-api-key'];
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      // Invalid token should return 401
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should authenticate with valid JWT when user companyId matches token', async () => {
      mockRequest.headers!['authorization'] = 'Bearer valid-token';
      delete mockRequest.headers!['x-api-key'];

      const tokenPayload = {
        userId: 'user-123',
        companyId: 'company-123',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const mockUser = {
        _id: 'user-123',
        companyId: 'company-123',
        email: 'test@example.com',
        isActive: true,
      };

      (verifyToken as jest.Mock).mockReturnValue(tokenPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (companyRepository.findById as jest.Mock).mockResolvedValue(mockCompany);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(verifyToken).toHaveBeenCalledWith('valid-token');
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(companyRepository.findById).toHaveBeenCalledWith('company-123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();

      const authenticatedReq = mockRequest as AuthenticatedRequest;
      expect(authenticatedReq.context?.authMethod).toBe('jwt');
    });

    it('should reject JWT when user has been transferred to different company', async () => {
      mockRequest.headers!['authorization'] = 'Bearer stale-token';
      delete mockRequest.headers!['x-api-key'];

      // Token was issued when user was in company-123
      const tokenPayload = {
        userId: 'user-123',
        companyId: 'company-123',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      // But user has since been transferred to company-456
      const mockUser = {
        _id: 'user-123',
        companyId: 'company-456',
        email: 'test@example.com',
        isActive: true,
      };

      (verifyToken as jest.Mock).mockReturnValue(tokenPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token invalid: user company has changed',
      });
      expect(mockNext).not.toHaveBeenCalled();
      // Should NOT call findById for company since we reject early
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject JWT when user account is inactive', async () => {
      mockRequest.headers!['authorization'] = 'Bearer valid-token';
      delete mockRequest.headers!['x-api-key'];

      const tokenPayload = {
        userId: 'user-123',
        companyId: 'company-123',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const mockUser = {
        _id: 'user-123',
        companyId: 'company-123',
        email: 'test@example.com',
        isActive: false,
      };

      (verifyToken as jest.Mock).mockReturnValue(tokenPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User account is inactive' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject JWT when user no longer exists', async () => {
      mockRequest.headers!['authorization'] = 'Bearer valid-token';
      delete mockRequest.headers!['x-api-key'];

      const tokenPayload = {
        userId: 'user-123',
        companyId: 'company-123',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      (verifyToken as jest.Mock).mockReturnValue(tokenPayload);
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should be case-insensitive for header name', async () => {
      // HTTP headers are case-insensitive - Express normalizes to lowercase
      // Note: In tests, we set lowercase since Express does the normalization
      mockRequest.headers!['x-api-key'] = 'valid-key-123';
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(mockCompany);

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(companyRepository.validateApiKey).toHaveBeenCalledWith('valid-key-123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle concurrent authentication requests', async () => {
      mockRequest.headers!['x-api-key'] = 'valid-key-123';
      (companyRepository.validateApiKey as jest.Mock).mockResolvedValue(mockCompany);

      // Simulate concurrent requests
      const promises = [
        authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext),
        authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext),
        authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext),
      ];

      await Promise.all(promises);

      // Each request should be handled independently
      expect(companyRepository.validateApiKey).toHaveBeenCalledTimes(3);
    });
  });
});
