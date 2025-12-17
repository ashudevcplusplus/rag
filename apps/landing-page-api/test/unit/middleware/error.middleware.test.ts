import { Request, Response, NextFunction } from 'express';
import { errorHandler, asyncHandler } from '../../../src/middleware/error.middleware';
import { AppError, ValidationError } from '../../../src/types/error.types';
import { z } from 'zod';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockRequest = {
      path: '/api/test',
      method: 'GET',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('should handle Zod validation errors', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ]);

    errorHandler(zodError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: zodError.issues,
    });
  });

  it('should handle ValidationError', () => {
    const validationError = new ValidationError('Invalid input');

    errorHandler(validationError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid input',
    });
  });

  it('should handle AppError', () => {
    const appError = new AppError(404, 'Resource not found');

    errorHandler(appError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Resource not found',
      statusCode: 404,
    });
  });

  it('should handle unexpected errors in development', () => {
    process.env.NODE_ENV = 'development';
    const unexpectedError = new Error('Unexpected error');

    errorHandler(unexpectedError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unexpected error',
      statusCode: 500,
    });
  });

  it('should hide error details in production', () => {
    process.env.NODE_ENV = 'production';
    const unexpectedError = new Error('Unexpected error');

    errorHandler(unexpectedError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      statusCode: 500,
    });
  });
});

describe('asyncHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should call next with error when async function throws', async () => {
    const error = new Error('Test error');
    const asyncFn = async () => {
      throw error;
    };

    const handler = asyncHandler(asyncFn);
    await handler(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should not call next when async function succeeds', async () => {
    const asyncFn = async () => {
      // Success
    };

    const handler = asyncHandler(asyncFn);
    await handler(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });
});

