"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_middleware_1 = require("../../../src/middleware/auth.middleware");
// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
describe('Auth Middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
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
        it('should allow health check without API key', () => {
            mockRequest.path = '/health';
            delete mockRequest.headers['x-api-key'];
            (0, auth_middleware_1.authenticateRequest)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
        it('should reject request without API key', () => {
            delete mockRequest.headers['x-api-key'];
            (0, auth_middleware_1.authenticateRequest)(mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'API key required' });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should reject request with invalid API key', () => {
            process.env.API_KEYS = 'valid-key-123';
            mockRequest.headers['x-api-key'] = 'invalid-key';
            (0, auth_middleware_1.authenticateRequest)(mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should accept request with valid API key', () => {
            process.env.API_KEYS = 'valid-key-123,another-key';
            mockRequest.headers['x-api-key'] = 'valid-key-123';
            (0, auth_middleware_1.authenticateRequest)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockRequest.context).toEqual({
                companyId: 'company-123',
                apiKey: 'valid-key-123',
            });
        });
        it('should use default API keys if env not set', () => {
            delete process.env.API_KEYS;
            mockRequest.headers['x-api-key'] = 'dev-key-123';
            (0, auth_middleware_1.authenticateRequest)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should extract companyId from params', () => {
            mockRequest.headers['x-api-key'] = 'dev-key-123';
            mockRequest.params = { companyId: 'test-company' };
            (0, auth_middleware_1.authenticateRequest)(mockRequest, mockResponse, mockNext);
            expect(mockRequest.context?.companyId).toBe('test-company');
        });
        it('should use default companyId if not in params', () => {
            mockRequest.headers['x-api-key'] = 'dev-key-123';
            mockRequest.params = {};
            (0, auth_middleware_1.authenticateRequest)(mockRequest, mockResponse, mockNext);
            expect(mockRequest.context?.companyId).toBe('default');
        });
    });
    describe('authorizeCompany', () => {
        it('should pass through if no companyId in route', () => {
            mockRequest.params = {};
            mockRequest.context = {
                companyId: 'company-123',
                apiKey: 'dev-key-123',
            };
            (0, auth_middleware_1.authorizeCompany)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should pass through if context matches companyId', () => {
            mockRequest.params = { companyId: 'company-123' };
            mockRequest.context = {
                companyId: 'company-123',
                apiKey: 'dev-key-123',
            };
            (0, auth_middleware_1.authorizeCompany)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should pass through even if context does not match (MVP behavior)', () => {
            mockRequest.params = { companyId: 'company-456' };
            mockRequest.context = {
                companyId: 'company-123',
                apiKey: 'dev-key-123',
            };
            (0, auth_middleware_1.authorizeCompany)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should handle missing context gracefully', () => {
            mockRequest.params = { companyId: 'company-123' };
            delete mockRequest.context;
            (0, auth_middleware_1.authorizeCompany)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
