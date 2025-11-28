/**
 * Standard pagination response structure
 */
export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create standardized pagination response
 */
export function createPaginationResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): PaginationResponse<T> {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Parse pagination query parameters
 */
export function parsePaginationQuery(req: { query: Record<string, unknown> }): {
  page: number;
  limit: number;
} {
  const page = parseInt((req.query.page as string) || '1', 10) || 1;
  const limit = parseInt((req.query.limit as string) || '10', 10) || 10;
  return { page, limit };
}
