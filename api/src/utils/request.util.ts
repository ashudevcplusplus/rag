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

/**
 * Timeout error class for distinguishing timeout errors
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wrap a promise with a timeout
 *
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds
 * @param errorMessage - Optional custom error message
 * @returns The promise result or throws TimeoutError
 *
 * @example
 * ```typescript
 * // Wrap an API call with a 30 second timeout
 * const result = await withTimeout(
 *   openai.chat.completions.create({ ... }),
 *   30000,
 *   'OpenAI API call timed out'
 * );
 * ```
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage?: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage || `Request timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}
