import { Types, Document } from "mongoose";

/**
 * Mongoose document with ObjectId
 */
type MongooseDoc = {
  _id?: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Output type with _id as string
 */
type WithStringId<T> = Omit<T, "_id"> & { _id: string };

/**
 * Convert MongoDB ObjectId to string in a document
 * Handles both lean documents and Mongoose documents
 */
export function toStringId<T extends MongooseDoc>(
  doc: T | Document,
): WithStringId<T> {
  const plainDoc =
    "toObject" in doc && typeof doc.toObject === "function"
      ? doc.toObject()
      : doc;

  const result = { ...plainDoc };
  if (result._id) {
    result._id = result._id.toString();
  }
  return result as WithStringId<T>;
}

/**
 * Convert MongoDB ObjectIds to strings in an array of documents
 */
export function toStringIds<T extends MongooseDoc>(
  docs: (T | Document)[],
): WithStringId<T>[] {
  return docs.map((doc) => toStringId<T>(doc as T));
}
