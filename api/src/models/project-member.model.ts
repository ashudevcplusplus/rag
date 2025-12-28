import { Schema, model, Document, Types } from 'mongoose';
import { IProjectMember } from '../schemas/project-member.schema';
import { ProjectRole } from '@rag/types';

export interface IProjectMemberDocument
  extends
    Omit<IProjectMember, '_id' | 'projectId' | 'userId' | 'addedBy' | 'createdAt' | 'updatedAt'>,
    Document {
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  addedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectMemberSchema = new Schema<IProjectMemberDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    role: {
      type: String,
      enum: Object.values(ProjectRole),
      default: ProjectRole.VIEWER,
    },
    permissions: {
      type: Schema.Types.Mixed,
    },

    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'project_members',
  }
);

// Compound unique index - user can only be a member of a project once
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ projectId: 1 });
projectMemberSchema.index({ userId: 1 });
projectMemberSchema.index({ projectId: 1, role: 1 });

export const ProjectMemberModel = model<IProjectMemberDocument>(
  'ProjectMember',
  projectMemberSchema
);
