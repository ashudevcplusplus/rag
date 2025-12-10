import { Types } from 'mongoose';

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
