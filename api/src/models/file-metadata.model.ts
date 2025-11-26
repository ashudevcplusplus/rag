import { Schema, model, Document, Types } from 'mongoose';
import { IFileMetadata, UploadStatus, ProcessingStatus } from '../schemas/file-metadata.schema';

export interface IFileMetadataDocument
  extends Omit<IFileMetadata, '_id' | 'projectId' | 'uploadedBy'>,
    Document {
  projectId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
}

const fileMetadataSchema = new Schema<IFileMetadataDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // File Info
    filename: {
      type: String,
      required: true,
      maxlength: 255,
    },
    originalFilename: {
      type: String,
      required: true,
      maxlength: 255,
    },
    filepath: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },

    // Processing Status
    uploadStatus: {
      type: String,
      enum: Object.values(UploadStatus),
      default: UploadStatus.UPLOADED,
    },
    processingStatus: {
      type: String,
      enum: Object.values(ProcessingStatus),
      default: ProcessingStatus.PENDING,
    },
    indexingJobId: {
      type: String,
    },

    // Processing Results
    textExtracted: {
      type: Boolean,
      default: false,
    },
    textLength: {
      type: Number,
    },
    chunkCount: {
      type: Number,
    },
    vectorIndexed: {
      type: Boolean,
      default: false,
    },
    vectorCollection: {
      type: String,
    },

    // Timestamps
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processingStartedAt: {
      type: Date,
    },
    processingCompletedAt: {
      type: Date,
    },
    vectorIndexedAt: {
      type: Date,
    },
    lastAccessedAt: {
      type: Date,
    },

    // Error Handling
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Soft delete
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'file_metadata',
  }
);

// Indexes
fileMetadataSchema.index({ projectId: 1 });
fileMetadataSchema.index({ uploadedBy: 1 });
fileMetadataSchema.index({ processingStatus: 1 });
fileMetadataSchema.index({ hash: 1 });
fileMetadataSchema.index({ uploadedAt: -1 });
fileMetadataSchema.index({ deletedAt: 1 });
fileMetadataSchema.index({ tags: 1 });
fileMetadataSchema.index({ projectId: 1, processingStatus: 1 });
fileMetadataSchema.index({ projectId: 1, uploadedAt: -1 });

export const FileMetadataModel = model<IFileMetadataDocument>('FileMetadata', fileMetadataSchema);
