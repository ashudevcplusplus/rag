import { Schema, model, Document, Types } from 'mongoose';
import { IEmbedding } from '../schemas/embedding.schema';

/**
 * ARCHITECTURE NOTE: Vector Storage Strategy
 *
 * Currently, embedding vectors are stored directly in MongoDB for simplicity.
 * For production scale, consider migrating vectors to a dedicated vector database
 * (e.g., Qdrant, Pinecone, Weaviate) for:
 *   - Efficient similarity search (ANN algorithms)
 *   - Reduced MongoDB document size
 *   - Better query performance for high-dimensional data
 *
 * The `vectorCollection` field in FileMetadata can reference the external
 * collection/namespace in the vector DB.
 *
 * Migration path:
 *   1. Keep metadata (fileId, projectId, chunkCount, provider) in MongoDB
 *   2. Store actual vectors in vector DB with fileId as the payload
 *   3. Use TTL or manual cleanup to sync deletions
 */
export interface IEmbeddingDocument
  extends Omit<IEmbedding, '_id' | 'fileId' | 'projectId' | 'deletedAt'>,
    Document {
  fileId: Types.ObjectId;
  projectId: Types.ObjectId;
  deletedAt?: Date;
}

const embeddingSchema = new Schema<IEmbeddingDocument>(
  {
    fileId: {
      type: Schema.Types.ObjectId,
      ref: 'FileMetadata',
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    chunkCount: {
      type: Number,
      required: true,
    },
    contents: {
      type: [String],
      required: true,
    },
    vectors: {
      type: [[Number]],
      required: true,
    },
    provider: {
      type: String,
      enum: ['inhouse', 'openai', 'gemini'],
      required: true,
    },
    modelName: {
      type: String,
      required: true,
    },
    vectorDimensions: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d', // TTL index: documents expire 7 days after creation
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only createdAt is needed for TTL
    collection: 'embeddings',
  }
);

// Indexes
embeddingSchema.index({ fileId: 1 }); // For retrieving file embeddings
embeddingSchema.index({ projectId: 1 });
// createdAt index is created automatically by the 'expires' option, but we can explicit if needed.
// The 'expires' option creates a TTL index.

export const EmbeddingModel = model<IEmbeddingDocument>('Embedding', embeddingSchema);
