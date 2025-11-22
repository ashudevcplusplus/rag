"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const company_rate_limiter_middleware_1 = require("../../../src/middleware/company-rate-limiter.middleware");
const ioredis_1 = __importDefault(require("ioredis"));
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
    let mockRedis;
    let mockRequest;
    let mockResponse;
    let mockNext;
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedis = {
            incr: jest.fn(),
            expire: jest.fn(),
            ttl: jest.fn(),
        };
        ioredis_1.default.mockImplementation(() => mockRedis);
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
            await (0, company_rate_limiter_middleware_1.companyRateLimiter)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRedis.incr).not.toHaveBeenCalled();
        });
        it('should allow request under limit', async () => {
            mockRequest.params = { companyId: 'company-123' };
            mockRedis.incr.mockResolvedValue(50);
            mockRedis.ttl.mockResolvedValue(30);
            await (0, company_rate_limiter_middleware_1.companyRateLimiter)(mockRequest, mockResponse, mockNext);
            expect(mockRedis.incr).toHaveBeenCalledWith('company-123');
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
        it('should set expiry on first request', async () => {
            mockRequest.params = { companyId: 'company-123' };
            mockRedis.incr.mockResolvedValue(1);
            mockRedis.ttl.mockResolvedValue(60);
            await (0, company_rate_limiter_middleware_1.companyRateLimiter)(mockRequest, mockResponse, mockNext);
            expect(mockRedis.expire).toHaveBeenCalledWith('company-123', 60);
        });
        it('should set rate limit headers', async () => {
            mockRequest.params = { companyId: 'company-123' };
            mockRedis.incr.mockResolvedValue(50);
            mockRedis.ttl.mockResolvedValue(30);
            await (0, company_rate_limiter_middleware_1.companyRateLimiter)(mockRequest, mockResponse, mockNext);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 50);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
        });
        it('should reject request over limit', async () => {
            mockRequest.params = { companyId: 'company-123' };
            mockRedis.incr.mockResolvedValue(101);
            mockRedis.ttl.mockResolvedValue(45);
            await (0, company_rate_limiter_middleware_1.companyRateLimiter)(mockRequest, mockResponse, mockNext);
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
            await (0, company_rate_limiter_middleware_1.companyRateLimiter)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
        it('should handle zero TTL', async () => {
            mockRequest.params = { companyId: 'company-123' };
            mockRedis.incr.mockResolvedValue(50);
            mockRedis.ttl.mockResolvedValue(0);
            await (0, company_rate_limiter_middleware_1.companyRateLimiter)(mockRequest, mockResponse, mockNext);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
        });
    });
    describe('ipRateLimiter', () => {
        it('should allow request under limit', async () => {
            const req = { ...mockRequest, ip: '192.168.1.1' };
            mockRedis.incr.mockResolvedValue(10);
            mockRedis.expire.mockResolvedValue(1);
            await (0, company_rate_limiter_middleware_1.ipRateLimiter)(req, mockResponse, mockNext);
            expect(mockRedis.incr).toHaveBeenCalledWith('ip:192.168.1.1');
            expect(mockNext).toHaveBeenCalled();
        });
        it('should set expiry on first request', async () => {
            const req = { ...mockRequest, ip: '192.168.1.1' };
            mockRedis.incr.mockResolvedValue(1);
            await (0, company_rate_limiter_middleware_1.ipRateLimiter)(req, mockResponse, mockNext);
            expect(mockRedis.expire).toHaveBeenCalledWith('ip:192.168.1.1', 60);
        });
        it('should reject request over limit', async () => {
            const req = { ...mockRequest, ip: '192.168.1.1' };
            mockRedis.incr.mockResolvedValue(21);
            await (0, company_rate_limiter_middleware_1.ipRateLimiter)(req, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(429);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Too many requests from this IP',
                message: 'Please try again later',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should handle unknown IP', async () => {
            const req = { ...mockRequest };
            delete req.ip;
            mockRedis.incr.mockResolvedValue(1);
            await (0, company_rate_limiter_middleware_1.ipRateLimiter)(req, mockResponse, mockNext);
            expect(mockRedis.incr).toHaveBeenCalledWith('ip:unknown');
        });
        it('should fail open on Redis error', async () => {
            const req = { ...mockRequest, ip: '192.168.1.1' };
            mockRedis.incr.mockRejectedValue(new Error('Redis error'));
            await (0, company_rate_limiter_middleware_1.ipRateLimiter)(req, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('RATE_LIMIT_CONFIG', () => {
        it('should export configuration', () => {
            expect(company_rate_limiter_middleware_1.RATE_LIMIT_CONFIG).toEqual({
                WINDOW_SIZE_IN_SECONDS: 60,
                MAX_WINDOW_REQUESTS: 100,
            });
        });
    });
});
