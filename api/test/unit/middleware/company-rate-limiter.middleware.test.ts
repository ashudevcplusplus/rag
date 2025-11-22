import { Request, Response, NextFunction } from 'express';
import {
  companyRateLimiter,
  ipRateLimiter,
  RATE_LIMIT_CONFIG,
} from '../../../src/middleware/company-rate-limiter.middleware';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('ioredis');
jest.mock('../../../src/config', () => ({
  CONFIG: {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
  },
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Company Rate Limiter Middleware', () => {
  let mockRedis: jest.Mocked<Redis>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

    mockRequest = {
      params: {},
      ip: '127.0.0.1',
      path: '/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('companyRateLimiter', () => {
    it('should skip rate limiting if no companyId in params', async () => {
      mockRequest.params = {};

      await companyRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    it('should allow request under limit', async () => {
      mockRequest.params = { companyId: 'company-123' };
      mockRedis.incr.mockResolvedValue(50);
      mockRedis.ttl.mockResolvedValue(30);

      await companyRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedis.incr).toHaveBeenCalledWith('company-123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should set expiry on first request', async () => {
      mockRequest.params = { companyId: 'company-123' };
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.ttl.mockResolvedValue(60);

      await companyRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedis.expire).toHaveBeenCalledWith('company-123', 60);
    });

    it('should set rate limit headers', async () => {
      mockRequest.params = { companyId: 'company-123' };
      mockRedis.incr.mockResolvedValue(50);
      mockRedis.ttl.mockResolvedValue(30);

      await companyRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 50);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('should reject request over limit', async () => {
      mockRequest.params = { companyId: 'company-123' };
      mockRedis.incr.mockResolvedValue(101);
      mockRedis.ttl.mockResolvedValue(45);

      await companyRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Maximum 100 requests per minute.',
        retryAfter: 45,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail open on Redis error', async () => {
      mockRequest.params = { companyId: 'company-123' };
      mockRedis.incr.mockRejectedValue(new Error('Redis error'));

      await companyRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle zero TTL', async () => {
      mockRequest.params = { companyId: 'company-123' };
      mockRedis.incr.mockResolvedValue(50);
      mockRedis.ttl.mockResolvedValue(0);

      await companyRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });
  });

  describe('ipRateLimiter', () => {
    it('should allow request under limit', async () => {
      const req = { ...mockRequest, ip: '192.168.1.1' } as Request;
      mockRedis.incr.mockResolvedValue(10);
      mockRedis.expire.mockResolvedValue(1);

      await ipRateLimiter(req, mockResponse as Response, mockNext);

      expect(mockRedis.incr).toHaveBeenCalledWith('ip:192.168.1.1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set expiry on first request', async () => {
      const req = { ...mockRequest, ip: '192.168.1.1' } as Request;
      mockRedis.incr.mockResolvedValue(1);

      await ipRateLimiter(req, mockResponse as Response, mockNext);

      expect(mockRedis.expire).toHaveBeenCalledWith('ip:192.168.1.1', 60);
    });

    it('should reject request over limit', async () => {
      const req = { ...mockRequest, ip: '192.168.1.1' } as Request;
      mockRedis.incr.mockResolvedValue(21);

      await ipRateLimiter(req, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many requests from this IP',
        message: 'Please try again later',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unknown IP', async () => {
      const req = { ...mockRequest } as Request;
      delete (req as any).ip;
      mockRedis.incr.mockResolvedValue(1);

      await ipRateLimiter(req, mockResponse as Response, mockNext);

      expect(mockRedis.incr).toHaveBeenCalledWith('ip:unknown');
    });

    it('should fail open on Redis error', async () => {
      const req = { ...mockRequest, ip: '192.168.1.1' } as Request;
      mockRedis.incr.mockRejectedValue(new Error('Redis error'));

      await ipRateLimiter(req, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('RATE_LIMIT_CONFIG', () => {
    it('should export configuration', () => {
      expect(RATE_LIMIT_CONFIG).toEqual({
        WINDOW_SIZE_IN_SECONDS: 60,
        MAX_WINDOW_REQUESTS: 100,
      });
    });
  });
});
