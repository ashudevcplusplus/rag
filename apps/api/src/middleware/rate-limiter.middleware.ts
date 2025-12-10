import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Factory function to create a rate limiter
 */
const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string,
  type: string = 'Rate limit'
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (req, res) => {
      logger.warn(`${type} exceeded`, {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Rate limiter for file uploads
export const uploadLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  100,
  'Too many file uploads from this IP, please try again later',
  'Upload rate limit'
);

// Rate limiter for search queries
export const searchLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  100,
  'Too many search requests, please try again later',
  'Search rate limit'
);

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});
