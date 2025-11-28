import { Request } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Extract company ID from authenticated request or request body
 */
export function getCompanyId(req: Request): string | null {
  const authReq = req as AuthenticatedRequest;
  return authReq.context?.companyId || (req.body?.companyId as string) || null;
}

/**
 * Extract company ID from authenticated request, throw error if not found
 */
export function requireCompanyId(req: Request): string {
  const companyId = getCompanyId(req);
  if (!companyId) {
    throw new Error('Company ID required');
  }
  return companyId;
}
