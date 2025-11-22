import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Extended Request type with authentication context
export interface AuthenticatedRequest extends Request {
  context?: {
    companyId: string;
    apiKey: string;
  };
}

// Simple API key validation (for MVP - extend for production)
const VALID_API_KEYS = new Set((process.env.API_KEYS || 'dev-key-123,test-key-456').split(','));

export const authenticateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;

  // Allow health check without auth
  if (req.path === '/health') {
    next();
    return;
  }

  // Check for API key
  if (!apiKey) {
    logger.warn('Authentication failed: Missing API key', {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({ error: 'API key required' });
    return;
  }

  // Validate API key
  if (!VALID_API_KEYS.has(apiKey)) {
    logger.warn('Authentication failed: Invalid API key', {
      path: req.path,
      ip: req.ip,
      apiKey: apiKey.substring(0, 8) + '...',
    });
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  // Attach context to request
  const authReq = req as AuthenticatedRequest;
  authReq.context = {
    companyId: req.params.companyId || 'default',
    apiKey,
  };

  logger.debug('Request authenticated', {
    path: req.path,
    companyId: authReq.context.companyId,
  });

  next();
};

// Optional: Per-company authorization check
export const authorizeCompany = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;
  const requestedCompanyId = req.params.companyId;

  // In a real system, verify the API key has access to this company
  // For MVP, we'll just log it
  if (authReq.context && requestedCompanyId !== authReq.context.companyId) {
    logger.debug('Company access', {
      authenticatedCompany: authReq.context.companyId,
      requestedCompany: requestedCompanyId,
    });
  }

  next();
};
