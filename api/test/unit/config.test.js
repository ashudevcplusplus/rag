"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../src/config");
describe('Config', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    it('should use default values when env vars are not set', () => {
        delete process.env.QDRANT_URL;
        delete process.env.EMBED_URL;
        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
        delete process.env.PORT;
        // Re-import to get fresh config
        jest.resetModules();
        const { CONFIG: freshConfig } = require('../../src/config');
        expect(freshConfig.QDRANT_URL).toBe('http://localhost:6333');
        expect(freshConfig.EMBED_URL).toBe('http://localhost:5001/embed');
        expect(freshConfig.REDIS_HOST).toBe('localhost');
        expect(freshConfig.REDIS_PORT).toBe(6379);
        expect(freshConfig.PORT).toBe(8000);
    });
    it('should use environment variables when set', () => {
        process.env.QDRANT_URL = 'http://qdrant:6333';
        process.env.EMBED_URL = 'http://embed:5001/embed';
        process.env.REDIS_HOST = 'redis-host';
        process.env.REDIS_PORT = '6380';
        process.env.PORT = '9000';
        jest.resetModules();
        const { CONFIG: freshConfig } = require('../../src/config');
        expect(freshConfig.QDRANT_URL).toBe('http://qdrant:6333');
        expect(freshConfig.EMBED_URL).toBe('http://embed:5001/embed');
        expect(freshConfig.REDIS_HOST).toBe('redis-host');
        expect(freshConfig.REDIS_PORT).toBe(6380);
        expect(freshConfig.PORT).toBe(9000);
    });
    it('should parse PORT as integer', () => {
        process.env.PORT = '8080';
        jest.resetModules();
        const { CONFIG: freshConfig } = require('../../src/config');
        expect(typeof freshConfig.PORT).toBe('number');
        expect(freshConfig.PORT).toBe(8080);
    });
    it('should parse REDIS_PORT as integer', () => {
        process.env.REDIS_PORT = '6380';
        jest.resetModules();
        const { CONFIG: freshConfig } = require('../../src/config');
        expect(typeof freshConfig.REDIS_PORT).toBe('number');
        expect(freshConfig.REDIS_PORT).toBe(6380);
    });
    it('should export CONFIG object', () => {
        expect(config_1.CONFIG).toBeDefined();
        expect(typeof config_1.CONFIG).toBe('object');
        expect(config_1.CONFIG).toHaveProperty('QDRANT_URL');
        expect(config_1.CONFIG).toHaveProperty('EMBED_URL');
        expect(config_1.CONFIG).toHaveProperty('REDIS_HOST');
        expect(config_1.CONFIG).toHaveProperty('REDIS_PORT');
        expect(config_1.CONFIG).toHaveProperty('PORT');
    });
});
