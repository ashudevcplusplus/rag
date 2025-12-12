import { createPaginationResponse, parsePaginationQuery } from '../../../src/utils/pagination.util';

describe('Pagination Utilities', () => {
  describe('createPaginationResponse', () => {
    it('should create correct pagination response structure', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = createPaginationResponse(items, 1, 10, 100);

      expect(result).toEqual({
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
        },
      });
    });

    it('should calculate totalPages correctly', () => {
      const result = createPaginationResponse([], 1, 10, 25);

      expect(result.pagination.totalPages).toBe(3); // 25/10 = 2.5, ceil = 3
    });

    it('should handle exact division for totalPages', () => {
      const result = createPaginationResponse([], 1, 10, 100);

      expect(result.pagination.totalPages).toBe(10);
    });

    it('should handle single page of results', () => {
      const result = createPaginationResponse([], 1, 10, 5);

      expect(result.pagination.totalPages).toBe(1);
    });

    it('should handle empty results', () => {
      const result = createPaginationResponse([], 1, 10, 0);

      expect(result.items).toEqual([]);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should preserve item types', () => {
      interface User {
        id: number;
        name: string;
      }

      const users: User[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      const result = createPaginationResponse(users, 1, 10, 2);

      expect(result.items[0].name).toBe('Alice');
      expect(result.items[1].name).toBe('Bob');
    });

    it('should handle large page numbers', () => {
      const result = createPaginationResponse([], 1000, 10, 10000);

      expect(result.pagination.page).toBe(1000);
      expect(result.pagination.totalPages).toBe(1000);
    });

    it('should handle limit of 1', () => {
      const result = createPaginationResponse([{ id: 1 }], 5, 1, 100);

      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.totalPages).toBe(100);
    });

    it('should handle very large totals', () => {
      const result = createPaginationResponse([], 1, 100, 1000000);

      expect(result.pagination.total).toBe(1000000);
      expect(result.pagination.totalPages).toBe(10000);
    });
  });

  describe('parsePaginationQuery', () => {
    it('should parse valid page and limit', () => {
      const req = { query: { page: '2', limit: '20' } };

      const result = parsePaginationQuery(req);

      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should use default page of 1', () => {
      const req = { query: { limit: '20' } };

      const result = parsePaginationQuery(req);

      expect(result.page).toBe(1);
    });

    it('should use default limit of 10', () => {
      const req = { query: { page: '2' } };

      const result = parsePaginationQuery(req);

      expect(result.limit).toBe(10);
    });

    it('should use defaults for empty query', () => {
      const req = { query: {} };

      const result = parsePaginationQuery(req);

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should handle string "0" for page', () => {
      const req = { query: { page: '0', limit: '10' } };

      const result = parsePaginationQuery(req);

      // parseInt('0') returns 0, which is falsy, so it should default to 1
      // But actually the code does parseInt(...) || 1
      // So 0 || 1 = 1
      expect(result.page).toBe(1);
    });

    it('should handle invalid page string', () => {
      const req = { query: { page: 'invalid', limit: '10' } };

      const result = parsePaginationQuery(req);

      expect(result.page).toBe(1);
    });

    it('should handle invalid limit string', () => {
      const req = { query: { page: '1', limit: 'invalid' } };

      const result = parsePaginationQuery(req);

      expect(result.limit).toBe(10);
    });

    it('should handle negative values', () => {
      const req = { query: { page: '-5', limit: '-10' } };

      const result = parsePaginationQuery(req);

      // parseInt('-5') = -5, which is truthy, so it's used
      // This is an edge case the implementation doesn't handle
      expect(result.page).toBe(-5);
      expect(result.limit).toBe(-10);
    });

    it('should handle floating point strings', () => {
      const req = { query: { page: '2.5', limit: '10.9' } };

      const result = parsePaginationQuery(req);

      // parseInt takes the integer part
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should handle numbers with leading zeros', () => {
      const req = { query: { page: '05', limit: '010' } };

      const result = parsePaginationQuery(req);

      expect(result.page).toBe(5);
      expect(result.limit).toBe(10);
    });

    it('should handle mixed valid and invalid values', () => {
      const req = { query: { page: '5', limit: 'abc' } };

      const result = parsePaginationQuery(req);

      expect(result.page).toBe(5);
      expect(result.limit).toBe(10);
    });

    it('should handle query with extra properties', () => {
      const req = {
        query: {
          page: '2',
          limit: '20',
          sort: 'createdAt',
          order: 'desc',
        },
      };

      const result = parsePaginationQuery(req);

      // Should only return page and limit
      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should handle null values in query', () => {
      const req = { query: { page: null, limit: null } };

      const result = parsePaginationQuery(req as any);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle undefined values in query', () => {
      const req = { query: { page: undefined, limit: undefined } };

      const result = parsePaginationQuery(req as any);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});
