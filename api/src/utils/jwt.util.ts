import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

export interface JWTPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
}

/**
 * Generate JWT token for user
 */
export function generateToken(payload: JWTPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES_IN } as any);
}

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, CONFIG.JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch {
    return null;
  }
}
