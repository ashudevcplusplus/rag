import { Request, Response } from 'express';
import { database } from '../config/database';

/**
 * Health check endpoint
 * GET /health
 */
export const healthCheck = (_req: Request, res: Response): void => {
  const dbStatus = database.isConnectionActive() ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'landing-page-api',
    database: dbStatus,
  });
};

/**
 * Liveness probe
 * GET /health/live
 */
export const liveness = (_req: Request, res: Response): void => {
  res.json({ status: 'alive' });
};

/**
 * Readiness probe
 * GET /health/ready
 */
export const readiness = (_req: Request, res: Response): void => {
  if (database.isConnectionActive()) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'database not connected' });
  }
};

