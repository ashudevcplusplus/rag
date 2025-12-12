import Redis from 'ioredis';
import { MockRedisClient, MockScanStream, createMockRedisClient } from '../../lib/mock-utils';

// Mock ioredis BEFORE importing CacheService
jest.mock('ioredis');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Type-safe mock Redis client
const mockRedis: MockRedisClient = createMockRedisClient();

(Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as unknown as Redis);

// Import CacheService AFTER setting up mocks
import { CacheService } from '../../../src/services/cache.service';

// Helper to create a mock scan stream for tests
function createTestScanStream(keys: string[], emitData: boolean = true): MockScanStream {
  const stream: MockScanStream = {
    on: jest.fn(),
  };

  stream.on = jest.fn((event: string, callback: (data?: string[]) => void): MockScanStream => {
    if (event === 'data' && emitData && keys.length > 0) {
      setTimeout(() => callback(keys), 0);
    } else if (event === 'end') {
      setTimeout(() => callback(), emitData && keys.length > 0 ? 10 : 0);
    }
    return stream;
  });

  return stream;
}

describe('CacheService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateKey', () => {
    it('should generate a deterministic key for a query', () => {
      const key1 = CacheService.generateKey('company-123', 'test query', 10);
      const key2 = CacheService.generateKey('company-123', 'test query', 10);

      expect(key1).toBe(key2);
      expect(key1).toContain('company-123');
    });

    it('should generate different keys for different queries', () => {
      const key1 = CacheService.generateKey('company-123', 'query 1', 10);
      const key2 = CacheService.generateKey('company-123', 'query 2', 10);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different limits', () => {
      const key1 = CacheService.generateKey('company-123', 'query', 10);
      const key2 = CacheService.generateKey('company-123', 'query', 20);

      expect(key1).not.toBe(key2);
    });

    it('should handle filters in key generation', () => {
      const key1 = CacheService.generateKey('company-123', 'query', 10, { fileId: 'file1' });
      const key2 = CacheService.generateKey('company-123', 'query', 10, { fileId: 'file2' });

      expect(key1).not.toBe(key2);
    });

    it('should normalize query (trim and lowercase)', () => {
      const key1 = CacheService.generateKey('company-123', '  TEST QUERY  ', 10);
      const key2 = CacheService.generateKey('company-123', 'test query', 10);

      expect(key1).toBe(key2);
    });
  });

  describe('get', () => {
    it('should return cached data on hit', async () => {
      const cachedData = { results: [{ id: '1', score: 0.9 }] };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await CacheService.get('test-key');

      expect(result).toEqual(cachedData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await CacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should return null and log error on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await CacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await CacheService.get('test-key');

      // Service should fail gracefully and return null
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set cache with default TTL', async () => {
      const data = { results: [] };
      mockRedis.set.mockResolvedValue('OK');

      await CacheService.set('test-key', data);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(data), 'EX', 3600);
    });

    it('should set cache with custom TTL', async () => {
      const data = { results: [] };
      mockRedis.set.mockResolvedValue('OK');

      await CacheService.set('test-key', data, 7200);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(data), 'EX', 7200);
    });

    it('should not throw on Redis error', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      await expect(CacheService.set('test-key', {})).resolves.not.toThrow();
    });
  });

  describe('invalidateCompany', () => {
    it('should delete all keys for a company', async () => {
      const mockStream = createTestScanStream([
        'rag_cache:company-123:key1',
        'rag_cache:company-123:key2',
      ]);

      mockRedis.scanStream.mockReturnValue(mockStream);
      mockRedis.del.mockResolvedValue(2);

      await CacheService.invalidateCompany('company-123');

      await jest.runAllTimersAsync();

      expect(mockRedis.scanStream).toHaveBeenCalledWith({
        match: 'rag_cache:company-123:*',
        count: 100,
      });
      expect(mockRedis.del).toHaveBeenCalledWith('company-123:key1', 'company-123:key2');
    });

    it('should handle no keys found', async () => {
      const mockStream = createTestScanStream([], false);

      mockRedis.scanStream.mockReturnValue(mockStream);

      await CacheService.invalidateCompany('company-123');

      await jest.runAllTimersAsync();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedis.scanStream.mockImplementation(() => {
        throw new Error('Scan error');
      });

      await expect(CacheService.invalidateCompany('company-123')).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      // Mock needs to be set up before the service is imported
      // Since Redis is created at module load, we need to mock it differently
      expect(CacheService.getStats).toBeDefined();

      // Since Redis is instantiated at module load, we can't easily mock it here
      // This test verifies the method exists and can be called
      const stats = await CacheService.getStats();
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('memory');
    });

    it('should handle missing memory info', async () => {
      mockRedis.info.mockResolvedValue('other_info:value\n');
      mockRedis.dbsize.mockResolvedValue(0);

      const stats = await CacheService.getStats();

      expect(stats).toEqual({
        keys: 0,
        memory: 'unknown',
      });
    });

    it('should return default values on error', async () => {
      mockRedis.info.mockRejectedValue(new Error('Redis error'));

      const stats = await CacheService.getStats();

      expect(stats).toEqual({
        keys: 0,
        memory: 'unknown',
      });
    });
  });

  describe('deleteKey', () => {
    it('should delete a specific cache key', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await CacheService.deleteKey('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should return false if key does not exist', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await CacheService.deleteKey('nonexistent-key');

      expect(result).toBe(false);
    });

    it('should return false on Redis error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const result = await CacheService.deleteKey('test-key');

      expect(result).toBe(false);
    });
  });

  describe('invalidateApiKey', () => {
    it('should delete the API key cache entry', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await CacheService.invalidateApiKey('ck_testapikey123');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringMatching(/^apikey:[a-f0-9]{16}$/));
    });

    it('should return false if API key was not cached', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await CacheService.invalidateApiKey('ck_uncachedkey');

      expect(result).toBe(false);
    });

    it('should return false on Redis error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const result = await CacheService.invalidateApiKey('ck_testapikey123');

      expect(result).toBe(false);
    });
  });

  describe('getApiKeyCacheKey', () => {
    it('should generate a deterministic cache key for an API key', () => {
      const key1 = CacheService.getApiKeyCacheKey('ck_testapikey123');
      const key2 = CacheService.getApiKeyCacheKey('ck_testapikey123');

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^apikey:[a-f0-9]{16}$/);
    });

    it('should generate different keys for different API keys', () => {
      const key1 = CacheService.getApiKeyCacheKey('ck_apikey1');
      const key2 = CacheService.getApiKeyCacheKey('ck_apikey2');

      expect(key1).not.toBe(key2);
    });
  });

  describe('getApiKeyCacheTTL', () => {
    it('should return the API key cache TTL', () => {
      const ttl = CacheService.getApiKeyCacheTTL();

      expect(ttl).toBe(300); // 5 minutes
    });
  });

  describe('clearAll', () => {
    it('should clear all cache entries', async () => {
      const mockStream = createTestScanStream(['rag_cache:key1', 'rag_cache:key2']);
      mockRedis.scanStream.mockReturnValue(mockStream);
      mockRedis.del.mockResolvedValue(2);

      const resultPromise = CacheService.clearAll();

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe(2);
      expect(mockRedis.scanStream).toHaveBeenCalledWith({
        match: 'rag_cache:*',
        count: 100,
      });
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should return 0 when no keys found', async () => {
      const mockStream = createTestScanStream([], false);
      mockRedis.scanStream.mockReturnValue(mockStream);

      const resultPromise = CacheService.clearAll();
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe(0);
    });
  });

  describe('clearCompany', () => {
    it('should clear cache for a specific company', async () => {
      const mockStream = createTestScanStream([
        'rag_cache:company-123:key1',
        'rag_cache:company-123:key2',
      ]);
      mockRedis.scanStream.mockReturnValue(mockStream);
      mockRedis.del.mockResolvedValue(2);

      const resultPromise = CacheService.clearCompany('company-123');

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe(2);
      expect(mockRedis.scanStream).toHaveBeenCalledWith({
        match: 'rag_cache:company-123:*',
        count: 100,
      });
      expect(mockRedis.del).toHaveBeenCalledWith('company-123:key1', 'company-123:key2');
    });

    it('should return 0 when no keys found for company', async () => {
      const mockStream = createTestScanStream([], false);
      mockRedis.scanStream.mockReturnValue(mockStream);

      const resultPromise = CacheService.clearCompany('empty-company');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe(0);
    });
  });

  describe('generateKey edge cases', () => {
    it('should handle rerank flag in key generation', () => {
      const key1 = CacheService.generateKey('company-123', 'query', 10, undefined, false);
      const key2 = CacheService.generateKey('company-123', 'query', 10, undefined, true);

      expect(key1).not.toBe(key2);
    });

    it('should handle embedding provider in key generation', () => {
      const key1 = CacheService.generateKey('company-123', 'query', 10, undefined, false, 'openai');
      const key2 = CacheService.generateKey('company-123', 'query', 10, undefined, false, 'gemini');

      expect(key1).not.toBe(key2);
    });

    it('should handle nested filter objects', () => {
      const key1 = CacheService.generateKey('company-123', 'query', 10, {
        nested: { key: 'value1' },
      });
      const key2 = CacheService.generateKey('company-123', 'query', 10, {
        nested: { key: 'value2' },
      });

      expect(key1).not.toBe(key2);
    });

    it('should generate same key for same filter with different property order', () => {
      const key1 = CacheService.generateKey('company-123', 'query', 10, {
        a: 'first',
        b: 'second',
      });
      const key2 = CacheService.generateKey('company-123', 'query', 10, {
        b: 'second',
        a: 'first',
      });

      expect(key1).toBe(key2);
    });

    it('should handle empty filter object', () => {
      const key1 = CacheService.generateKey('company-123', 'query', 10, {});
      const key2 = CacheService.generateKey('company-123', 'query', 10);

      // Both should work without errors
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
    });

    it('should handle filter with array values', () => {
      const key1 = CacheService.generateKey('company-123', 'query', 10, {
        fileIds: ['file1', 'file2'],
      });
      const key2 = CacheService.generateKey('company-123', 'query', 10, {
        fileIds: ['file2', 'file1'],
      });

      // Arrays should be sorted for deterministic keys
      expect(key1).toBe(key2);
    });
  });

  describe('get edge cases', () => {
    it('should handle empty string in cache', async () => {
      mockRedis.get.mockResolvedValue('""');

      const result = await CacheService.get('test-key');

      expect(result).toBe('');
    });

    it('should handle array in cache', async () => {
      const cachedArray = [1, 2, 3];
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedArray));

      const result = await CacheService.get('test-key');

      expect(result).toEqual(cachedArray);
    });

    it('should handle null value in cache', async () => {
      mockRedis.get.mockResolvedValue('null');

      const result = await CacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set edge cases', () => {
    it('should handle setting array data', async () => {
      const arrayData = [{ id: 1 }, { id: 2 }];
      mockRedis.set.mockResolvedValue('OK');

      await CacheService.set('test-key', arrayData);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(arrayData), 'EX', 3600);
    });

    it('should handle setting null data', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await CacheService.set('test-key', null);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'null', 'EX', 3600);
    });

    it('should handle very short TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await CacheService.set('test-key', {}, 1);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', '{}', 'EX', 1);
    });

    it('should handle very long TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const oneWeek = 7 * 24 * 60 * 60;

      await CacheService.set('test-key', {}, oneWeek);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', '{}', 'EX', oneWeek);
    });
  });
});
