import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/error.types';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle known operational errors
  if (err instanceof AppError) {
    logger.error('Operational error', {
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
      stack: err.stack,
    });

    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  // Handle unexpected errors
  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    statusCode: 500,
  });
};

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // All parameters are used: req and res passed to fn, next used in catch
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
};
