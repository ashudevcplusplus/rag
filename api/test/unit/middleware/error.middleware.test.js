"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_middleware_1 = require("../../../src/middleware/error.middleware");
const error_types_1 = require("../../../src/types/error.types");
// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));
describe('Error Middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
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
            const error = new error_types_1.ValidationError('Invalid input');
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            (0, error_middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid input',
                statusCode: 400,
            });
            expect(mockNext).not.toHaveBeenCalled();
            process.env.NODE_ENV = originalEnv;
        });
        it('should handle NotFoundError', () => {
            const error = new error_types_1.NotFoundError('Resource');
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            (0, error_middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
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
            (0, error_middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
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
            (0, error_middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Unexpected error',
                statusCode: 500,
            });
            process.env.NODE_ENV = originalEnv;
        });
        it('should handle errors without message', () => {
            const error = { name: 'Error' };
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            (0, error_middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            process.env.NODE_ENV = originalEnv;
        });
    });
    describe('asyncHandler', () => {
        it('should call the handler function', async () => {
            const handler = jest.fn().mockResolvedValue(undefined);
            const wrapped = (0, error_middleware_1.asyncHandler)(handler);
            await wrapped(mockRequest, mockResponse, mockNext);
            expect(handler).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should catch and forward errors to next', async () => {
            const error = new Error('Handler error');
            const handler = jest.fn().mockRejectedValue(error);
            const wrapped = (0, error_middleware_1.asyncHandler)(handler);
            await wrapped(mockRequest, mockResponse, mockNext);
            expect(handler).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
        it('should handle synchronous errors', async () => {
            const error = new Error('Sync error');
            const handler = jest.fn().mockImplementation(() => {
                throw error;
            });
            const wrapped = (0, error_middleware_1.asyncHandler)(handler);
            try {
                await wrapped(mockRequest, mockResponse, mockNext);
            }
            catch (e) {
                // Error should be caught by asyncHandler
            }
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
