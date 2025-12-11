import { Request } from 'express';
import { getCompanyId, requireCompanyId } from '../../../src/utils/request.util';
import { AuthenticatedRequest } from '../../../src/middleware/auth.middleware';
import {
  createMockRequest,
  createMockCompany,
  createMockAuthenticatedRequest,
} from '../../lib/mock-utils';

describe('RequestUtil', () => {
  describe('getCompanyId', () => {
    it('should return company ID from authenticated request context', () => {
      const companyId = 'company-123';
      const mockCompany = createMockCompany({ _id: companyId });
      const mockReq = createMockAuthenticatedRequest(mockCompany);

      const result = getCompanyId(mockReq as Request);

      expect(result).toBe(companyId);
    });

    it('should return company ID from request body when not in context', () => {
      const mockReq = createMockRequest({
        body: { companyId: 'body-company-123' },
      });

      const result = getCompanyId(mockReq as unknown as Request);

      expect(result).toBe('body-company-123');
    });

    it('should prefer context over body', () => {
      const companyId = 'context-company-123';
      const mockCompany = createMockCompany({ _id: companyId });
      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        body: { companyId: 'body-company-456' },
      });

      const result = getCompanyId(mockReq as Request);

      expect(result).toBe(companyId);
    });

    it('should return null when no company ID available', () => {
      const mockReq = createMockRequest({
        body: {},
      });

      const result = getCompanyId(mockReq as unknown as Request);

      expect(result).toBeNull();
    });

    it('should return null when context is undefined', () => {
      const mockReq = createMockRequest({}) as unknown as AuthenticatedRequest;
      mockReq.context = undefined as unknown as AuthenticatedRequest['context'];

      const result = getCompanyId(mockReq as Request);

      expect(result).toBeNull();
    });

    it('should return null when companyId in context is undefined', () => {
      const mockReq = createMockRequest({}) as unknown as AuthenticatedRequest;
      // Set context with undefined companyId (simulating missing companyId)
      (mockReq as unknown as { context: { companyId: undefined } }).context = {
        companyId: undefined,
      };

      const result = getCompanyId(mockReq as Request);

      expect(result).toBeNull();
    });

    it('should return null for empty string company ID', () => {
      const mockReq = createMockRequest({
        body: { companyId: '' },
      });

      const result = getCompanyId(mockReq as unknown as Request);

      // Empty string is falsy, should return null
      expect(result).toBeNull();
    });
  });

  describe('requireCompanyId', () => {
    it('should return company ID when present in context', () => {
      const companyId = 'company-123';
      const mockCompany = createMockCompany({ _id: companyId });
      const mockReq = createMockAuthenticatedRequest(mockCompany);

      const result = requireCompanyId(mockReq as Request);

      expect(result).toBe(companyId);
    });

    it('should return company ID when present in body', () => {
      const mockReq = createMockRequest({
        body: { companyId: 'body-company-123' },
      });

      const result = requireCompanyId(mockReq as unknown as Request);

      expect(result).toBe('body-company-123');
    });

    it('should throw error when company ID is not present', () => {
      const mockReq = createMockRequest({
        body: {},
      });

      expect(() => requireCompanyId(mockReq as unknown as Request)).toThrow('Company ID required');
    });

    it('should throw error when context is undefined and body has no companyId', () => {
      const mockReq = createMockRequest({}) as unknown as AuthenticatedRequest;
      mockReq.context = undefined as unknown as AuthenticatedRequest['context'];

      expect(() => requireCompanyId(mockReq as Request)).toThrow('Company ID required');
    });

    it('should throw error for empty string company ID', () => {
      const mockReq = createMockRequest({
        body: { companyId: '' },
      });

      expect(() => requireCompanyId(mockReq as unknown as Request)).toThrow('Company ID required');
    });

    it('should throw error when companyId is null', () => {
      const mockReq = createMockRequest({
        body: { companyId: null },
      });

      expect(() => requireCompanyId(mockReq as unknown as Request)).toThrow('Company ID required');
    });

    it('should not throw error for valid company ID', () => {
      const mockReq = createMockRequest({
        body: { companyId: 'valid-id' },
      });

      expect(() => requireCompanyId(mockReq as unknown as Request)).not.toThrow();
    });
  });
});
