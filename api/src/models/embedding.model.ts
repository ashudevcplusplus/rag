import { Schema, model, Document, Types } from 'mongoose';
import { IEmbedding } from '../schemas/embedding.schema';

export interface IEmbeddingDocument extends Omit<IEmbedding, '_id' | 'fileId' | 'projectId'>, Document {
  fileId: Types.ObjectId;
  projectId: Types.ObjectId;
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
    chunkIndex: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    vector: {
      type: [Number],
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only createdAt is needed for TTL
    collection: 'embeddings',
  }
);

// Indexes
embeddingSchema.index({ fileId: 1, chunkIndex: 1 }); // For retrieving chunks in order
embeddingSchema.index({ projectId: 1 });
// createdAt index is created automatically by the 'expires' option, but we can explicit if needed.
// The 'expires' option creates a TTL index.

export const EmbeddingModel = model<IEmbeddingDocument>('Embedding', embeddingSchema);

