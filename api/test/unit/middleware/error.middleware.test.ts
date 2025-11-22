import { Request, Response, NextFunction } from 'express';
import { errorHandler, asyncHandler } from '../../../src/middleware/error.middleware';
import { ValidationError, NotFoundError } from '../../../src/types/error.types';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      path: '/test',
      method: 'GET',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle AppError with correct status code', () => {
      const error = new ValidationError('Invalid input');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid input',
        statusCode: 400,
      });
      expect(mockNext).not.toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('Resource');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Resource not found',
        statusCode: 404,
      });
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle unexpected errors in production', () => {
      const error = new Error('Unexpected error');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        statusCode: 500,
      });
      process.env.NODE_ENV = originalEnv;
    });

    it('should show error message in non-production', () => {
      const error = new Error('Unexpected error');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unexpected error',
        statusCode: 500,
      });
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors without message', () => {
      const error = { name: 'Error' } as Error;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should call the handler function', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      const wrapped = asyncHandler(handler);
      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward errors to next', async () => {
      const error = new Error('Handler error');
      const handler = jest.fn().mockRejectedValue(error);

      const wrapped = asyncHandler(handler);
      await wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const handler = jest.fn().mockImplementation(() => {
        throw error;
      });

      const wrapped = asyncHandler(handler);
      try {
        await wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (e) {
        // Error should be caught by asyncHandler
      }

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
