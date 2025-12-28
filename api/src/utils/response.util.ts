import { Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../types/error.types';
import { logger } from './logger';

/**
 * Handle Zod validation errors and send appropriate response
 */
export function handleValidationError(res: Response, error: z.ZodError, context?: string): void {
  if (context) {
    logger.warn(`${context} validation failed`, { issues: error.issues });
  }
  res.status(400).json({
    error: 'Validation failed',
    details: error.issues,
  });
}

/**
 * Send standardized error responses
 */
export function sendErrorResponse(res: Response, statusCode: number, message: string): void {
  res.status(statusCode).json({ error: message });
}

/**
 * Send 404 Not Found response
 */
export function sendNotFoundResponse(res: Response, resource: string): void {
  sendErrorResponse(res, 404, `${resource} not found`);
}

/**
 * Send 409 Conflict response
 */
export function sendConflictResponse(res: Response, message: string): void {
  sendErrorResponse(res, 409, message);
}

/**
 * Send 400 Bad Request response
 */
export function sendBadRequestResponse(res: Response, message: string): void {
  sendErrorResponse(res, 400, message);
}

/**
 * Send 401 Unauthorized response
 */
export function sendUnauthorizedResponse(res: Response, message: string): void {
  sendErrorResponse(res, 401, message);
}

/**
 * Handle controller errors (ZodError, ValidationError, and generic errors)
 */
export function handleControllerError(res: Response, error: unknown, context: string): void {
  if (error instanceof z.ZodError) {
    handleValidationError(res, error, context);
    return;
  }

  if (error instanceof ValidationError) {
    // Handle specific validation errors with custom status codes
    if (error.message === 'Storage limit reached') {
      sendErrorResponse(res, 403, error.message);
      return;
    }
    sendErrorResponse(res, 400, error.message);
    return;
  }

  // Re-throw unexpected errors to be handled by error middleware
  logger.error(`Failed: ${context}`, { error });
  throw error;
}
