import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

// Create Redis client for rate limiting
const redis = new Redis({
  host: CONFIG.REDIS_HOST,
  port: CONFIG.REDIS_PORT,
  keyPrefix: 'rate_limit:',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error('Redis rate limiter error', { error: err });
});

redis.on('connect', () => {
  logger.info('Redis rate limiter connected');
});

// Configuration
const WINDOW_SIZE_IN_SECONDS = 60; // 1 minute window
const MAX_WINDOW_REQUESTS = 100; // 100 requests per minute per company

/**
 * Company-based rate limiting middleware
 * Uses sliding window counter stored in Redis
 */
export const companyRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract company ID from route params
    const companyId = req.params.companyId;

    if (!companyId) {
      // No company ID in route, skip rate limiting
      return next();
    }

    const key = companyId;
    const now = Date.now();

    // Increment counter
    const current = await redis.incr(key);

    // Set expiry on first request
    if (current === 1) {
      await redis.expire(key, WINDOW_SIZE_IN_SECONDS);
    }

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(key);
    const resetTime = ttl > 0 ? now + ttl * 1000 : now + WINDOW_SIZE_IN_SECONDS * 1000;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_WINDOW_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_WINDOW_REQUESTS - current));
    res.setHeader('X-RateLimit-Reset', Math.floor(resetTime / 1000));

    // Check if limit exceeded
    if (current > MAX_WINDOW_REQUESTS) {
      logger.warn('Rate limit exceeded', {
        companyId,
        requests: current,
        limit: MAX_WINDOW_REQUESTS,
        ip: req.ip,
      });

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${MAX_WINDOW_REQUESTS} requests per minute.`,
        retryAfter: ttl > 0 ? ttl : WINDOW_SIZE_IN_SECONDS,
      });
      return;
    }

    logger.debug('Rate limit check passed', {
      companyId,
      requests: current,
      limit: MAX_WINDOW_REQUESTS,
    });

    next();
  } catch (error) {
    logger.error('Rate limiter error', { error });
    // Fail open: allow request if rate limiter fails
    // In production, you might want to fail closed instead
    next();
  }
};

/**
 * IP-based rate limiting for authentication endpoints
 * More strict to prevent brute force attacks
 */
export const ipRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ip = req.ip || 'unknown';
    const key = `ip:${ip}`;
    const MAX_IP_REQUESTS = 20; // 20 requests per minute per IP
    const WINDOW = 60;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, WINDOW);
    }

    if (current > MAX_IP_REQUESTS) {
      logger.warn('IP rate limit exceeded', {
        ip,
        requests: current,
        path: req.path,
      });

      res.status(429).json({
        error: 'Too many requests from this IP',
        message: 'Please try again later',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('IP rate limiter error', { error });
    next(); // Fail open
  }
};

// Export configuration for testing
export const RATE_LIMIT_CONFIG = {
  WINDOW_SIZE_IN_SECONDS,
  MAX_WINDOW_REQUESTS,
};
