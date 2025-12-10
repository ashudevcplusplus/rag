import { Schema, model, Document, Types } from 'mongoose';
import { IEmbedding } from '../schemas/embedding.schema';

export interface IEmbeddingDocument
  extends Omit<IEmbedding, '_id' | 'fileId' | 'projectId' | 'deletedAt'>, Document {
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
