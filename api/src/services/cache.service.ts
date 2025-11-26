import Redis from 'ioredis';
import crypto from 'crypto';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

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
   * Generates a deterministic key for a search query
   */
  static generateKey(
    companyId: string,
    query: string,
    limit: number,
    filter?: Record<string, unknown>
  ): string {
    const normalizedQuery = query.trim().toLowerCase();
    const filterStr = filter ? JSON.stringify(filter) : '';
    const combined = `${normalizedQuery}:${limit}:${filterStr}`;
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
          void redis.del(...keysWithoutPrefix).then(() => {
            logger.info('Cache invalidated for company', {
              companyId,
              keysDeleted: keys.length,
            });
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
}
