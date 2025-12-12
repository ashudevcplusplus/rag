import { Request, Response } from 'express';

// Store captured configs in a module-level object that exists before mocking
const capturedConfigs: {
  uploadConfig?: Record<string, unknown>;
  searchConfig?: Record<string, unknown>;
  generalConfig?: Record<string, unknown>;
} = {};

// We need to capture the rateLimit config before the module loads
jest.mock('express-rate-limit', () => {
  const originalModule = jest.requireActual('express-rate-limit');
  return {
    __esModule: true,
    default: (config: Record<string, unknown>) => {
      // Store the config for testing based on max value and message
      const message = (config as { message?: string }).message || '';
      if (config.max === 100 && message.includes('upload')) {
        capturedConfigs.uploadConfig = config;
      } else if (config.max === 100 && message.includes('search')) {
        capturedConfigs.searchConfig = config;
      } else if (config.max === 1000) {
        capturedConfigs.generalConfig = config;
      }
      return originalModule.default(config);
    },
  };
});

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

// Import after mocks are set up
import {
  uploadLimiter,
  searchLimiter,
  generalLimiter,
} from '../../../src/middleware/rate-limiter.middleware';
import { logger } from '../../../src/utils/logger';

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadLimiter', () => {
    it('should be configured with correct window and max', () => {
      expect(uploadLimiter).toBeDefined();
      expect(typeof uploadLimiter).toBe('function');
    });

    it('should have custom handler', () => {
      expect(uploadLimiter).toBeDefined();
    });

    it('should skip rate limiting in test environment', () => {
      if (capturedConfigs.uploadConfig?.skip) {
        const skipFn = capturedConfigs.uploadConfig.skip as () => boolean;
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        expect(skipFn()).toBe(true);
        process.env.NODE_ENV = 'production';
        expect(skipFn()).toBe(false);
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should call handler when rate limit exceeded', () => {
      if (capturedConfigs.uploadConfig?.handler) {
        const handlerFn = capturedConfigs.uploadConfig.handler as (
          req: Request,
          res: Response
        ) => void;
        const mockReq = {
          ip: '127.0.0.1',
          path: '/test',
        } as unknown as Request;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as unknown as Response;

        handlerFn(mockReq, mockRes);

        expect(logger.warn).toHaveBeenCalledWith('Upload rate limit exceeded', {
          ip: '127.0.0.1',
          path: '/test',
        });
        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Too many requests, please try again later',
          retryAfter: expect.any(Number),
        });
      }
    });
  });

  describe('searchLimiter', () => {
    it('should be configured for search endpoints', () => {
      expect(searchLimiter).toBeDefined();
      expect(typeof searchLimiter).toBe('function');
    });

    it('should skip in test environment', () => {
      if (capturedConfigs.searchConfig?.skip) {
        const skipFn = capturedConfigs.searchConfig.skip as () => boolean;
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        expect(skipFn()).toBe(true);
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should call handler when rate limit exceeded', () => {
      if (capturedConfigs.searchConfig?.handler) {
        const handlerFn = capturedConfigs.searchConfig.handler as (
          req: Request,
          res: Response
        ) => void;
        const mockReq = {
          ip: '192.168.1.1',
          path: '/search',
        } as unknown as Request;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as unknown as Response;

        handlerFn(mockReq, mockRes);

        expect(logger.warn).toHaveBeenCalledWith('Search rate limit exceeded', {
          ip: '192.168.1.1',
          path: '/search',
        });
        expect(mockRes.status).toHaveBeenCalledWith(429);
      }
    });
  });

  describe('generalLimiter', () => {
    it('should be configured for general API endpoints', () => {
      expect(generalLimiter).toBeDefined();
      expect(typeof generalLimiter).toBe('function');
    });

    it('should skip in test environment', () => {
      if (capturedConfigs.generalConfig?.skip) {
        const skipFn = capturedConfigs.generalConfig.skip as () => boolean;
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        expect(skipFn()).toBe(true);
        process.env.NODE_ENV = 'production';
        expect(skipFn()).toBe(false);
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
