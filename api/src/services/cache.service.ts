import Redis from 'ioredis';
import crypto from 'crypto';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

// API key cache TTL: 5 minutes (should match auth.middleware.ts)
const API_KEY_CACHE_TTL = 300;

/**
 * Generate a cache key for an API key (hashed for security)
 * This must match the logic in auth.middleware.ts
 */
function getApiKeyCacheKey(apiKey: string): string {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  return `apikey:${hash}`;
}

// Create Redis client for caching
const redis = new Redis({
  host: CONFIG.REDIS_HOST,
  port: CONFIG.REDIS_PORT,
  keyPrefix: 'rag_cache:',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error('Redis cache client error', { error: err });
});

redis.on('connect', () => {
  logger.info('Redis cache client connected');
});

export class CacheService {
  /**
   * Deterministically stringify an object with sorted keys
   * This ensures consistent cache keys regardless of property order
   */
  private static sortedStringify(obj: Record<string, unknown>): string {
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      const value = obj[key];
      // Recursively sort nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sortedObj[key] = JSON.parse(this.sortedStringify(value as Record<string, unknown>));
      } else if (Array.isArray(value)) {
        // Sort arrays of primitives for consistency
        sortedObj[key] = [...value].sort();
      } else {
        sortedObj[key] = value;
      }
    }
    return JSON.stringify(sortedObj);
  }

  /**
   * Generates a deterministic key for a search query
   * Includes all filter parameters (projectId, fileId, fileIds) in the hash
   */
  static generateKey(
    companyId: string,
    query: string,
    limit: number,
    filter?: Record<string, unknown>,
    rerank: boolean = false,
    embeddingProvider?: 'openai' | 'gemini'
  ): string {
    const normalizedQuery = query.trim().toLowerCase();
    // Use sorted stringify for deterministic filter serialization
    const filterStr = filter ? this.sortedStringify(filter) : '';
    const providerStr = embeddingProvider || '';
    const combined = `${normalizedQuery}:${limit}:${filterStr}:${rerank}:${providerStr}`;
    const hash = crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
    return `${companyId}:${hash}`;
  }

  /**
   * Get cached results (returns null if miss)
   */
  static async get(key: string): Promise<unknown | null> {
    try {
      const data = await redis.get(key);
      if (data) {
        logger.debug('Cache hit', { key });
        return JSON.parse(data);
      }
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null; // Fail gracefully
    }
  }

  /**
   * Set cache with TTL (default 1 hour = 3600 seconds)
   */
  static async set(key: string, data: unknown, ttlSeconds = 3600): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
      logger.debug('Cache set', { key, ttlSeconds });
    } catch (error) {
      logger.error('Cache set error', { key, error });
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Invalidate all cache for a specific company (use after new uploads)
   */
  static async invalidateCompany(companyId: string): Promise<void> {
    try {
      const pattern = `rag_cache:${companyId}:*`;
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];

      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      stream.on('end', () => {
        if (keys.length > 0) {
          // Remove the prefix since ioredis adds it automatically
          const keysWithoutPrefix = keys.map((k) => k.replace('rag_cache:', ''));
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          redis.del(...keysWithoutPrefix).then(() => {
            logger.info('Cache invalidated', { companyId, keys: keys.length });
          });
        }
      });
    } catch (error) {
      logger.error('Cache invalidation error', { companyId, error });
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{ keys: number; memory: string }> {
    try {
      const info = await redis.info('memory');
      const dbsize = await redis.dbsize();
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return { keys: dbsize, memory };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return { keys: 0, memory: 'unknown' };
    }
  }

  /**
   * Clear all cache entries
   */
  static async clearAll(): Promise<number> {
    try {
      const pattern = 'rag_cache:*';
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];

      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        stream.on('end', async () => {
          try {
            if (keys.length > 0) {
              // Remove the prefix since ioredis adds it automatically
              const keysWithoutPrefix = keys.map((k) => k.replace('rag_cache:', ''));
              const deleted = await redis.del(...keysWithoutPrefix);
              logger.info('Cache cleared', { keys: deleted });
              resolve(deleted);
            } else {
              resolve(0);
            }
          } catch (error) {
            logger.error('Cache clear error', { error });
            reject(error);
          }
        });

        stream.on('error', (error) => {
          logger.error('Cache clear stream error', { error });
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Cache clear error', { error });
      throw error;
    }
  }

  /**
   * Clear cache for a specific company
   */
  static async clearCompany(companyId: string): Promise<number> {
    try {
      const pattern = `rag_cache:${companyId}:*`;
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];

      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        stream.on('end', async () => {
          try {
            if (keys.length > 0) {
              // Remove the prefix since ioredis adds it automatically
              const keysWithoutPrefix = keys.map((k) => k.replace('rag_cache:', ''));
              const deleted = await redis.del(...keysWithoutPrefix);
              logger.info('Cache cleared', { companyId, keys: deleted });
              resolve(deleted);
            } else {
              resolve(0);
            }
          } catch (error) {
            logger.error('Cache clear error', { companyId, error });
            reject(error);
          }
        });

        stream.on('error', (error) => {
          logger.error('Cache clear stream error', { companyId, error });
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Cache clear error', { companyId, error });
      throw error;
    }
  }

  /**
   * Delete a specific cache key
   */
  static async deleteKey(key: string): Promise<boolean> {
    try {
      const deleted = await redis.del(key);
      if (deleted > 0) {
        logger.debug('Cache key deleted', { key });
        return true;
      }
      logger.debug('Cache key not found', { key });
      return false;
    } catch (error) {
      logger.error('Cache key deletion error', { key, error });
      return false; // Fail gracefully
    }
  }

  /**
   * Invalidate API key cache for a company
   * Called when company status changes or company is soft-deleted
   */
  static async invalidateApiKey(apiKey: string): Promise<boolean> {
    const cacheKey = getApiKeyCacheKey(apiKey);
    try {
      const deleted = await redis.del(cacheKey);
      if (deleted > 0) {
        logger.info('API key cache invalidated', { cacheKey });
        return true;
      }
      logger.debug('API key cache not found (already expired or never cached)', { cacheKey });
      return false;
    } catch (error) {
      logger.error('API key cache invalidation error', { cacheKey, error });
      return false; // Fail gracefully
    }
  }

  /**
   * Get the API key cache TTL (for use by auth middleware)
   */
  static getApiKeyCacheTTL(): number {
    return API_KEY_CACHE_TTL;
  }

  /**
   * Generate an API key cache key (for use by auth middleware)
   */
  static getApiKeyCacheKey(apiKey: string): string {
    return getApiKeyCacheKey(apiKey);
  }
}
