import { Types } from 'mongoose';

/**
 * Convert MongoDB ObjectId to string in a document
 */
export function toStringId<T extends { _id?: Types.ObjectId | string }>(
  doc: T
): T & { _id: string } {
  const result = { ...doc };
  if (result._id) {
    result._id = result._id.toString();
  }
  return result as T & { _id: string };
}

/**
 * Convert MongoDB ObjectIds to strings in an array of documents
 */
export function toStringIds<T extends { _id?: Types.ObjectId | string }>(
  docs: T[]
): (T & { _id: string })[] {
  return docs.map(toStringId);
}

