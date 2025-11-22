"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_types_1 = require("../../../src/types/error.types");
describe('Error Types', () => {
    describe('AppError', () => {
        it('should create error with status code and message', () => {
            const error = new error_types_1.AppError(400, 'Bad request');
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Bad request');
            expect(error.isOperational).toBe(true);
            expect(error).toBeInstanceOf(Error);
        });
        it('should allow custom isOperational flag', () => {
            const error = new error_types_1.AppError(500, 'Server error', false);
            expect(error.isOperational).toBe(false);
        });
        it('should have proper prototype chain', () => {
            const error = new error_types_1.AppError(400, 'Test');
            expect(error).toBeInstanceOf(error_types_1.AppError);
            expect(error).toBeInstanceOf(Error);
        });
    });
    describe('ValidationError', () => {
        it('should create validation error with 400 status', () => {
            const error = new error_types_1.ValidationError('Invalid input');
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Invalid input');
            expect(error).toBeInstanceOf(error_types_1.ValidationError);
            expect(error).toBeInstanceOf(error_types_1.AppError);
        });
    });
    describe('NotFoundError', () => {
        it('should create not found error with 404 status', () => {
            const error = new error_types_1.NotFoundError('User');
            expect(error.statusCode).toBe(404);
            expect(error.message).toBe('User not found');
            expect(error).toBeInstanceOf(error_types_1.NotFoundError);
            expect(error).toBeInstanceOf(error_types_1.AppError);
        });
        it('should format resource name correctly', () => {
            const error = new error_types_1.NotFoundError('Document');
            expect(error.message).toBe('Document not found');
        });
    });
    describe('ExternalServiceError', () => {
        it('should create external service error with 502 status', () => {
            const error = new error_types_1.ExternalServiceError('Database', 'Connection failed');
            expect(error.statusCode).toBe(502);
            expect(error.message).toBe('Database error: Connection failed');
            expect(error).toBeInstanceOf(error_types_1.ExternalServiceError);
            expect(error).toBeInstanceOf(error_types_1.AppError);
        });
    });
    describe('isErrorWithMessage', () => {
        it('should return true for error with message', () => {
            const error = new Error('Test error');
            expect((0, error_types_1.isErrorWithMessage)(error)).toBe(true);
        });
        it('should return true for object with message property', () => {
            const obj = { message: 'Test' };
            expect((0, error_types_1.isErrorWithMessage)(obj)).toBe(true);
        });
        it('should return false for null', () => {
            expect((0, error_types_1.isErrorWithMessage)(null)).toBe(false);
        });
        it('should return false for non-object', () => {
            expect((0, error_types_1.isErrorWithMessage)('string')).toBe(false);
            expect((0, error_types_1.isErrorWithMessage)(123)).toBe(false);
        });
        it('should return false for object without message', () => {
            const obj = { code: 500 };
            expect((0, error_types_1.isErrorWithMessage)(obj)).toBe(false);
        });
        it('should return false for object with non-string message', () => {
            const obj = { message: 123 };
            expect((0, error_types_1.isErrorWithMessage)(obj)).toBe(false);
        });
    });
    describe('getErrorMessage', () => {
        it('should return message from error object', () => {
            const error = new Error('Test error');
            expect((0, error_types_1.getErrorMessage)(error)).toBe('Test error');
        });
        it('should return message from object with message', () => {
            const obj = { message: 'Custom error' };
            expect((0, error_types_1.getErrorMessage)(obj)).toBe('Custom error');
        });
        it('should return string representation for other types', () => {
            expect((0, error_types_1.getErrorMessage)(123)).toBe('123');
            expect((0, error_types_1.getErrorMessage)(null)).toBe('null');
            expect((0, error_types_1.getErrorMessage)(undefined)).toBe('undefined');
        });
        it('should handle unknown error types', () => {
            const unknown = { code: 500 };
            expect((0, error_types_1.getErrorMessage)(unknown)).toBe('[object Object]');
        });
    });
});
