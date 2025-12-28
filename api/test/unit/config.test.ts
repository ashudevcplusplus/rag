import { CONFIG } from '../../src/config';

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
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.PORT;

    // Re-import to get fresh config
    jest.resetModules();
    const { CONFIG: freshConfig } = require('../../src/config');

    expect(freshConfig.QDRANT_URL).toBe('http://localhost:6333');
    expect(freshConfig.REDIS_HOST).toBe('localhost');
    expect(freshConfig.REDIS_PORT).toBe(6379);
    expect(freshConfig.PORT).toBe(8000);
  });

  it('should use environment variables when set', () => {
    process.env.QDRANT_URL = 'http://qdrant:6333';
    process.env.REDIS_HOST = 'redis-host';
    process.env.REDIS_PORT = '6380';
    process.env.PORT = '9000';

    jest.resetModules();
    const { CONFIG: freshConfig } = require('../../src/config');

    expect(freshConfig.QDRANT_URL).toBe('http://qdrant:6333');
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
    expect(CONFIG).toBeDefined();
    expect(typeof CONFIG).toBe('object');
    expect(CONFIG).toHaveProperty('QDRANT_URL');
    expect(CONFIG).toHaveProperty('REDIS_HOST');
    expect(CONFIG).toHaveProperty('REDIS_PORT');
    expect(CONFIG).toHaveProperty('PORT');
    expect(CONFIG).toHaveProperty('EMBEDDING_PROVIDER');
    expect(CONFIG).toHaveProperty('OPENAI_API_KEY');
  });

  it('should have correct embedding provider options', () => {
    jest.resetModules();
    const { CONFIG: freshConfig } = require('../../src/config');

    // EMBEDDING_PROVIDER should be 'openai' or 'gemini'
    expect(['openai', 'gemini']).toContain(freshConfig.EMBEDDING_PROVIDER);
  });
});
