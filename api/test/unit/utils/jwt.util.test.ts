import { generateToken, verifyToken, decodeToken, JWTPayload } from '../../../src/utils/jwt.util';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../../../src/config';

describe('JWT Utility', () => {
  const mockPayload: JWTPayload = {
    userId: 'user-123',
    companyId: 'company-456',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in the token', () => {
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as JWTPayload & { iat: number; exp: number };

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.companyId).toBe(mockPayload.companyId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should set expiration time', () => {
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as { exp: number; iat: number };

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyToken', () => {
    it('should verify and return payload for valid token', () => {
      const token = generateToken(mockPayload);
      const verified = verifyToken(token);

      expect(verified.userId).toBe(mockPayload.userId);
      expect(verified.companyId).toBe(mockPayload.companyId);
      expect(verified.email).toBe(mockPayload.email);
      expect(verified.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });

    it('should throw error for tampered token', () => {
      const token = generateToken(mockPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyToken(tamperedToken)).toThrow('Invalid or expired token');
    });

    it('should throw error for token signed with different secret', () => {
      const tokenWithDifferentSecret = jwt.sign(mockPayload, 'different-secret', {
        expiresIn: '1h',
      });

      expect(() => verifyToken(tokenWithDifferentSecret)).toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', () => {
      // Create a token that expired 1 hour ago
      const expiredToken = jwt.sign(mockPayload, CONFIG.JWT_SECRET, {
        expiresIn: '-1h',
      });

      expect(() => verifyToken(expiredToken)).toThrow('Invalid or expired token');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.companyId).toBe(mockPayload.companyId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
    });

    it('should return null for invalid token format', () => {
      const result = decodeToken('not-a-valid-jwt');

      expect(result).toBeNull();
    });

    it('should decode expired token without throwing', () => {
      const expiredToken = jwt.sign(mockPayload, CONFIG.JWT_SECRET, {
        expiresIn: '-1h',
      });

      const decoded = decodeToken(expiredToken);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
    });

    it('should decode token signed with different secret', () => {
      // decodeToken doesn't verify signature, just decodes
      const tokenWithDifferentSecret = jwt.sign(mockPayload, 'different-secret', {
        expiresIn: '1h',
      });

      const decoded = decodeToken(tokenWithDifferentSecret);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
    });
  });
});
