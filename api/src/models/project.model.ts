import { Schema, model, Document, Types } from 'mongoose';
import { IProject } from '../schemas/project.schema';
import { ProjectStatus, Visibility } from '@rag/types';

export interface IProjectDocument
  extends Omit<IProject, '_id' | 'companyId' | 'ownerId'>, Document {
  companyId: Types.ObjectId;
  ownerId: Types.ObjectId;
}

const projectSchema = new Schema<IProjectDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Project Info
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    color: {
      type: String,
    },
    icon: {
      type: String,
      maxlength: 50,
    },

    // Organization
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.ACTIVE,
    },
    visibility: {
      type: String,
      enum: Object.values(Visibility),
      default: Visibility.PRIVATE,
    },

    // Storage & Stats
    fileCount: {
      type: Number,
      default: 0,
    },
    totalSize: {
      type: Number,
      default: 0,
    },
    vectorCount: {
      type: Number,
      default: 0,
    },

    // Settings
    settings: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },

    // Audit
    deletedAt: {
      type: Date,
    },
    archivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'projects',
  }
);

// Compound unique index
projectSchema.index({ companyId: 1, slug: 1 }, { unique: true });
projectSchema.index({ companyId: 1 });
projectSchema.index({ ownerId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ deletedAt: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ companyId: 1, status: 1 });

// Pre-save hook to ensure slug is lowercase
projectSchema.pre('save', function (next) {
  if (this.slug) {
    this.slug = this.slug.toLowerCase();
  }
  next();
});

export const ProjectModel = model<IProjectDocument>('Project', projectSchema);
