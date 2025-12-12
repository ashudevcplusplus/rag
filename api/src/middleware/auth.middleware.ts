import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { companyRepository } from '../repositories/company.repository';
import { ICompany } from '../schemas/company.schema';
import { publishApiKeyTracking } from '../utils/async-events.util';
import { CacheService } from '../services/cache.service';

/**
 * Get company from cache or database
 */
async function getCompanyByApiKey(apiKey: string): Promise<ICompany | null> {
  const cacheKey = CacheService.getApiKeyCacheKey(apiKey);
  const cacheTTL = CacheService.getApiKeyCacheTTL();

  // Try cache first
  const cached = (await CacheService.get(cacheKey)) as ICompany | null;
  if (cached) {
    logger.debug('API key cache hit', { cacheKey });
    return cached;
  }

  // Cache miss - query database
  const company = await companyRepository.validateApiKey(apiKey);
  if (company) {
    // Cache the result
    await CacheService.set(cacheKey, company, cacheTTL);
    logger.debug('API key cached', { cacheKey, companyId: company._id });
  }

  return company;
}

// Extended Request type with authentication context
export interface AuthenticatedRequest extends Request {
  context?: {
    company: ICompany;
    companyId: string;
    apiKey: string;
  };
}

export const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  // Allow health check without auth
  if (req.path === '/health' || req.path.startsWith('/admin/queues')) {
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

  try {
    // Validate API key (cached in Redis for performance)
    const company = await getCompanyByApiKey(apiKey);

    if (!company) {
      logger.warn('Authentication failed: Invalid API key', {
        path: req.path,
        ip: req.ip,
        apiKey: apiKey.substring(0, 8) + '...',
      });
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Check company status
    if (company.status !== 'ACTIVE') {
      logger.warn('Authentication failed: Company not active', {
        path: req.path,
        companyId: company._id,
        status: company.status,
      });
      res.status(403).json({ error: `Company account is ${company.status.toLowerCase()}` });
      return;
    }

    // Attach context to request
    const authReq = req as AuthenticatedRequest;
    authReq.context = {
      company,
      companyId: company._id,
      apiKey,
    };

    logger.debug('Request authenticated', {
      path: req.path,
      companyId: company._id,
      companyName: company.name,
    });

    // One-line event publishing
    void publishApiKeyTracking({ companyId: company._id });

    next();
  } catch (error) {
    logger.error('Authentication error', { error, path: req.path });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional: Per-company authorization check
export const authorizeCompany = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;
  const requestedCompanyId = req.params.companyId;

  if (!authReq.context) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Verify the API key has access to this company
  if (requestedCompanyId && requestedCompanyId !== authReq.context.companyId) {
    logger.warn('Authorization failed: Company mismatch', {
      authenticatedCompany: authReq.context.companyId,
      requestedCompany: requestedCompanyId,
    });
    res.status(403).json({ error: 'Access denied to this company' });
    return;
  }

  next();
};
