import {
  AppError,
  ValidationError,
  NotFoundError,
  ExternalServiceError,
  isErrorWithMessage,
  getErrorMessage,
} from '../../../src/types/error.types';

describe('Error Types', () => {
  describe('AppError', () => {
    it('should create error with status code and message', () => {
      const error = new AppError(400, 'Bad request');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow custom isOperational flag', () => {
      const error = new AppError(500, 'Server error', false);

      expect(error.isOperational).toBe(false);
    });

    it('should have proper prototype chain', () => {
      const error = new AppError(400, 'Test');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with 404 status', () => {
      const error = new NotFoundError('User');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should format resource name correctly', () => {
      const error = new NotFoundError('Document');

      expect(error.message).toBe('Document not found');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error with 502 status', () => {
      const error = new ExternalServiceError('Database', 'Connection failed');

      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Database error: Connection failed');
      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('isErrorWithMessage', () => {
    it('should return true for error with message', () => {
      const error = new Error('Test error');
      expect(isErrorWithMessage(error)).toBe(true);
    });

    it('should return true for object with message property', () => {
      const obj = { message: 'Test' };
      expect(isErrorWithMessage(obj)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isErrorWithMessage(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isErrorWithMessage('string')).toBe(false);
      expect(isErrorWithMessage(123)).toBe(false);
    });

    it('should return false for object without message', () => {
      const obj = { code: 500 };
      expect(isErrorWithMessage(obj)).toBe(false);
    });

    it('should return false for object with non-string message', () => {
      const obj = { message: 123 };
      expect(isErrorWithMessage(obj)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return message from error object', () => {
      const error = new Error('Test error');
      expect(getErrorMessage(error)).toBe('Test error');
    });

    it('should return message from object with message', () => {
      const obj = { message: 'Custom error' };
      expect(getErrorMessage(obj)).toBe('Custom error');
    });

    it('should return string representation for other types', () => {
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle unknown error types', () => {
      const unknown = { code: 500 };
      expect(getErrorMessage(unknown)).toBe('[object Object]');
    });
  });
});
