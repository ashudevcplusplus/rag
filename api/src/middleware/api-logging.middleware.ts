import { Request, Response, NextFunction } from 'express';
import { publishApiLog } from '../utils/async-events.util';
import { EventSource } from '../types/enums';
import { AuthenticatedRequest } from './auth.middleware';

export const apiLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const authReq = req as AuthenticatedRequest;
  const originalSend = res.send;

  res.send = function (data: unknown) {
    res.send = originalSend;
    const responseTime = Date.now() - startTime;
    const responseSize = data ? Buffer.byteLength(JSON.stringify(data)) : 0;

    // One-line event publishing
    void publishApiLog({
      source: EventSource.API_LOGGING_MIDDLEWARE,
      companyId: authReq.context?.companyId,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      responseTime,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      apiKey: req.headers['x-api-key'] as string | undefined,
      requestSize: req.get('content-length')
        ? parseInt(req.get('content-length') || '0', 10)
        : undefined,
      responseSize,
    });

    return originalSend.call(this, data);
  };

  next();
};
