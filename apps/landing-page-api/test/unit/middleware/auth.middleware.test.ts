import { Request, Response, NextFunction } from 'express';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock CONFIG to control values in tests
const mockConfig = {
  NODE_ENV: 'development',
  ADMIN_API_KEY: 'test-admin-key-123',
  PORT: 8001,
  MONGODB_URI: 'mongodb://localhost/test',
  CORS_ORIGIN: 'http://localhost:5173',
};

jest.mock('../../../src/config', () => ({
  CONFIG: mockConfig,
}));

import { authenticateAdmin } from '../../../src/middleware/auth.middleware';

describe('authenticateAdmin', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset config values for each test
    mockConfig.NODE_ENV = 'development';
    mockConfig.ADMIN_API_KEY = 'test-admin-key-123';

    mockRequest = {
      headers: {},
      path: '/api/admin/contacts',
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('should allow request with valid API key', () => {
    mockRequest.headers = { 'x-api-key': 'test-admin-key-123' };

    authenticateAdmin(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as NextFunction
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should reject request without API key', () => {
    mockRequest.headers = {};

    authenticateAdmin(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as NextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'API key required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with invalid API key', () => {
    mockRequest.headers = { 'x-api-key': 'wrong-key' };

    authenticateAdmin(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as NextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should allow request in development when no API key is configured', () => {
    mockConfig.ADMIN_API_KEY = '';
    mockConfig.NODE_ENV = 'development';

    authenticateAdmin(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as NextFunction
    );

    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject request in production when no API key is configured', () => {
    mockConfig.ADMIN_API_KEY = '';
    mockConfig.NODE_ENV = 'production';

    authenticateAdmin(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as NextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Admin authentication not configured',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

