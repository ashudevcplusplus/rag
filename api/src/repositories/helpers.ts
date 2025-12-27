import { Types, Model, Document, FilterQuery } from 'mongoose';

/**
 * Utility type that converts ObjectId fields to string
 */
type ObjectIdToString<T> = {
  [K in keyof T]: T[K] extends Types.ObjectId ? string : T[K];
};

/**
 * Helper function to convert MongoDB ObjectIds to strings in repository results
 */
export function toStringId<T extends { _id: Types.ObjectId }>(doc: T): ObjectIdToString<T> {
  if (!doc) return doc as ObjectIdToString<T>;

  const result = { ...doc } as Record<string, unknown>;

  // Convert _id
  if (result._id && result._id instanceof Types.ObjectId) {
    result._id = result._id.toString();
  }

  // dynamically convert all other ObjectId fields
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const value = result[key];
      if (value instanceof Types.ObjectId) {
        result[key] = value.toString();
      }
    }
  }

  return result as ObjectIdToString<T>;
}

/**
 * Convert array of documents
 */
export function toStringIds<T extends { _id: Types.ObjectId }>(docs: T[]): ObjectIdToString<T>[] {
  if (!docs) return [];
  return docs.map((doc) => toStringId(doc));
}

// ============================================================================
// Pagination Utilities
// ============================================================================

/**
 * Standard paginated result structure
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Options for paginated queries
 */
export interface PaginateOptions {
  sort?: Record<string, 1 | -1>;
  select?: string;
}

/**
 * Calculate pagination skip value
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Execute a paginated query on a Mongoose model
 * Reduces boilerplate for pagination logic across repositories
 *
 * @example
 * ```typescript
 * const result = await executePaginatedQuery(
 *   UserModel,
 *   { companyId, deletedAt: null },
 *   page,
 *   limit,
 *   { sort: { createdAt: -1 }, select: 'name email' }
 * );
 * ```
 */
export async function executePaginatedQuery<TDoc extends Document, TResult>(
  model: Model<TDoc>,
  query: FilterQuery<TDoc>,
  page: number,
  limit: number,
  options: PaginateOptions = {}
): Promise<PaginatedResult<TResult>> {
  const { sort = { createdAt: -1 }, select } = options;
  const skip = calculateSkip(page, limit);

  let queryBuilder = model.find(query);

  if (select) {
    queryBuilder = queryBuilder.select(select);
  }

  const [results, total] = await Promise.all([
    queryBuilder.sort(sort).skip(skip).limit(limit).lean(),
    model.countDocuments(query),
  ]);

  return {
    items: toStringIds(results as unknown as { _id: Types.ObjectId }[]) as unknown as TResult[],
    total,
    page,
    totalPages: calculateTotalPages(total, limit),
  };
}

// ============================================================================
// Soft Delete Utilities
// ============================================================================

/**
 * Standard soft delete update object
 */
export function getSoftDeleteUpdate(): { deletedAt: Date } {
  return { deletedAt: new Date() };
}

/**
 * Standard query filter to exclude soft-deleted documents
 */
export function excludeDeleted<T extends { deletedAt?: Date | null }>(
  query: FilterQuery<T>
): FilterQuery<T> {
  return { ...query, deletedAt: null } as FilterQuery<T>;
}
