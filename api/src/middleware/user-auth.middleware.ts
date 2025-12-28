import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt.util';
import { userRepository } from '../repositories/user.repository';
import { getCompanyId } from '../utils/request.util';
import { sendUnauthorizedResponse } from '../utils/response.util';
import { logger } from '../utils/logger';

// Extend Express Request to include authenticated user
export interface AuthenticatedUserRequest extends Request {
  user?: JWTPayload & {
    isActive: boolean;
  };
}

/**
 * Middleware to authenticate requests using JWT token
 * Expects Authorization header: Bearer <token>
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendUnauthorizedResponse(res, 'Authorization token required');
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch {
      sendUnauthorizedResponse(res, 'Invalid or expired token');
      return;
    }

    // Verify user still exists and is active
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      sendUnauthorizedResponse(res, 'User not found');
      return;
    }

    if (!user.isActive) {
      sendUnauthorizedResponse(res, 'User account is inactive');
      return;
    }

    // Verify company matches the route parameter (if present)
    const routeCompanyId = getCompanyId(req);
    if (routeCompanyId && user.companyId !== routeCompanyId) {
      logger.warn('User company mismatch', {
        userId: user._id,
        userCompanyId: user.companyId,
        routeCompanyId,
      });
      sendUnauthorizedResponse(res, 'User does not belong to this company');
      return;
    }

    // Attach user info to request
    (req as AuthenticatedUserRequest).user = {
      ...payload,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    logger.error('User authentication error', { error });
    sendUnauthorizedResponse(res, 'Authentication failed');
  }
};

/**
 * Optional authentication - continues without error if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export const optionalAuthenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token - continue without user context
    next();
    return;
  }

  // Token provided - validate it
  await authenticateUser(req, res, next);
};
