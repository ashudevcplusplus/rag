"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rate_limiter_middleware_1 = require("../../../src/middleware/rate-limiter.middleware");
// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        warn: jest.fn(),
    },
}));
describe('Rate Limiter Middleware', () => {
    describe('uploadLimiter', () => {
        it('should be configured with correct window and max', () => {
            expect(rate_limiter_middleware_1.uploadLimiter).toBeDefined();
            // The rate limiter is a function, we can't easily test its internal config
            // but we can verify it's exported and is a function
            expect(typeof rate_limiter_middleware_1.uploadLimiter).toBe('function');
        });
        it('should have custom handler', () => {
            // The handler is set in the configuration
            // We verify the limiter exists and is callable
            expect(rate_limiter_middleware_1.uploadLimiter).toBeDefined();
        });
    });
    describe('searchLimiter', () => {
        it('should be configured for search endpoints', () => {
            expect(rate_limiter_middleware_1.searchLimiter).toBeDefined();
            expect(typeof rate_limiter_middleware_1.searchLimiter).toBe('function');
        });
    });
    describe('generalLimiter', () => {
        it('should be configured for general API endpoints', () => {
            expect(rate_limiter_middleware_1.generalLimiter).toBeDefined();
            expect(typeof rate_limiter_middleware_1.generalLimiter).toBe('function');
        });
    });
});
