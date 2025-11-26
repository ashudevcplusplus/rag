import { Types } from 'mongoose';

/**
 * Helper function to convert MongoDB ObjectIds to strings in repository results
 */
export function toStringId<T extends { _id: Types.ObjectId }>(
  doc: T
): Omit<T, '_id'> & { _id: string } {
  if (!doc) return doc as unknown as Omit<T, '_id'> & { _id: string };

  const result = { ...doc } as unknown as Record<string, unknown>;

  // Convert _id
  if (result._id && result._id instanceof Types.ObjectId) {
    result._id = result._id.toString();
  }

  // Convert common ObjectId fields
  const objectIdFields = ['companyId', 'userId', 'projectId', 'ownerId', 'uploadedBy', 'addedBy'];
  for (const field of objectIdFields) {
    if (result[field] && result[field] instanceof Types.ObjectId) {
      result[field] = result[field].toString();
    }
  }

  return result as unknown as Omit<T, '_id'> & { _id: string };
}

/**
 * Convert array of documents
 */
export function toStringIds<T extends { _id: Types.ObjectId }>(
  docs: T[]
): (Omit<T, '_id'> & { _id: string })[] {
  if (!docs) return [];
  return docs.map((doc) => toStringId(doc));
}
