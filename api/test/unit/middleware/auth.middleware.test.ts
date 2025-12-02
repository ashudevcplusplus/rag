import { Request, Response, NextFunction } from 'express';
import {
  authenticateRequest,
  authorizeCompany,
  AuthenticatedRequest,
} from '../../../src/middleware/auth.middleware';
import { companyRepository } from '../../../src/repositories/company.repository';
import { CompanyStatus, SubscriptionTier } from '../../../src/types/enums';
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
  },
}));

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

    it('should reject request without API key', async () => {
      delete mockRequest.headers!['x-api-key'];

      await authenticateRequest(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'API key required' });
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
      };

      authorizeCompany(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Access denied to this company' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
