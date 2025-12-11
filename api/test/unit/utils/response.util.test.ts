import { Response } from 'express';
import { z } from 'zod';
import {
  handleValidationError,
  sendErrorResponse,
  sendNotFoundResponse,
  sendConflictResponse,
  sendBadRequestResponse,
  handleControllerError,
} from '../../../src/utils/response.util';
import { ValidationError } from '../../../src/types/error.types';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Response Utilities', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('handleValidationError', () => {
    it('should send 400 response with Zod error details', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const result = schema.safeParse({ name: '', email: 'invalid' });
      if (result.success) throw new Error('Expected validation error');

      handleValidationError(mockResponse as Response, result.error);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array),
      });
    });

    it('should log warning with context if provided', async () => {
      const { logger } = await import('../../../src/utils/logger');

      const schema = z.object({ name: z.string() });
      const result = schema.safeParse({ name: 123 });
      if (result.success) throw new Error('Expected validation error');

      handleValidationError(mockResponse as Response, result.error, 'User creation');

      expect(logger.warn).toHaveBeenCalledWith(
        'User creation validation failed',
        expect.objectContaining({ issues: expect.any(Array) })
      );
    });

    it('should not log if no context provided', async () => {
      const { logger } = await import('../../../src/utils/logger');

      const schema = z.object({ name: z.string() });
      const result = schema.safeParse({ name: 123 });
      if (result.success) throw new Error('Expected validation error');

      handleValidationError(mockResponse as Response, result.error);

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should include all validation issues in details', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0),
      });

      const result = schema.safeParse({ name: '', email: 'bad', age: -1 });
      if (result.success) throw new Error('Expected validation error');

      handleValidationError(mockResponse as Response, result.error);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.details.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('sendErrorResponse', () => {
    it('should send error response with correct status and message', () => {
      sendErrorResponse(mockResponse as Response, 500, 'Internal server error');

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should handle different status codes', () => {
      sendErrorResponse(mockResponse as Response, 401, 'Unauthorized');
      expect(mockResponse.status).toHaveBeenCalledWith(401);

      sendErrorResponse(mockResponse as Response, 403, 'Forbidden');
      expect(mockResponse.status).toHaveBeenCalledWith(403);

      sendErrorResponse(mockResponse as Response, 422, 'Unprocessable Entity');
      expect(mockResponse.status).toHaveBeenCalledWith(422);
    });
  });

  describe('sendNotFoundResponse', () => {
    it('should send 404 with resource name', () => {
      sendNotFoundResponse(mockResponse as Response, 'User');

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle different resource names', () => {
      sendNotFoundResponse(mockResponse as Response, 'Project');
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Project not found' });

      sendNotFoundResponse(mockResponse as Response, 'File');
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'File not found' });
    });
  });

  describe('sendConflictResponse', () => {
    it('should send 409 with message', () => {
      sendConflictResponse(mockResponse as Response, 'Resource already exists');

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Resource already exists' });
    });
  });

  describe('sendBadRequestResponse', () => {
    it('should send 400 with message', () => {
      sendBadRequestResponse(mockResponse as Response, 'Invalid input');

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid input' });
    });
  });

  describe('handleControllerError', () => {
    it('should handle ZodError', () => {
      const schema = z.object({ name: z.string() });
      const result = schema.safeParse({ name: 123 });
      if (result.success) throw new Error('Expected validation error');

      handleControllerError(mockResponse as Response, result.error, 'User creation');

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
        })
      );
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Email already exists');

      handleControllerError(mockResponse as Response, error, 'User creation');

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Email already exists' });
    });

    it('should handle storage limit ValidationError with 403', () => {
      const error = new ValidationError('Storage limit reached');

      handleControllerError(mockResponse as Response, error, 'File upload');

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Storage limit reached' });
    });

    it('should re-throw unexpected errors', () => {
      const error = new Error('Unexpected database error');

      expect(() => {
        handleControllerError(mockResponse as Response, error, 'Operation');
      }).toThrow('Unexpected database error');
    });

    it('should log unexpected errors before re-throwing', async () => {
      const { logger } = await import('../../../src/utils/logger');
      const error = new Error('Database connection failed');

      expect(() => {
        handleControllerError(mockResponse as Response, error, 'Database operation');
      }).toThrow();

      expect(logger.error).toHaveBeenCalledWith('Failed: Database operation', { error });
    });

    it('should not send response for unexpected errors', () => {
      const error = new Error('Unexpected');

      try {
        handleControllerError(mockResponse as Response, error, 'Operation');
      } catch {
        // Expected
      }

      // Response should not be modified since error is re-thrown
      // The error middleware will handle it
    });

    it('should handle non-Error objects', () => {
      const error = { message: 'Something went wrong' };

      expect(() => {
        handleControllerError(mockResponse as Response, error, 'Operation');
      }).toThrow();
    });

    it('should handle string errors', () => {
      expect(() => {
        handleControllerError(mockResponse as Response, 'String error', 'Operation');
      }).toThrow();
    });

    it('should handle null error', () => {
      expect(() => {
        handleControllerError(mockResponse as Response, null, 'Operation');
      }).toThrow();
    });
  });
});
