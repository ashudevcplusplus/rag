import { Schema, model, Document, Types } from 'mongoose';
import { IConversation } from '../schemas/conversation.schema';

export interface IConversationDocument
  extends Omit<IConversation, '_id' | 'companyId' | 'userId' | 'projectId'>, Document {
  companyId: Types.ObjectId;
  userId?: Types.ObjectId;
  projectId?: Types.ObjectId;
}

const conversationMessageSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [
      {
        fileId: String,
        fileName: String,
        projectId: String,
        projectName: String,
        chunkIndex: Number,
        content: String,
        score: Number,
      },
    ],
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const cachedContextSchema = new Schema(
  {
    sources: [
      {
        fileId: String,
        fileName: String,
        projectId: String,
        projectName: String,
        chunkIndex: Number,
        content: String,
        score: Number,
      },
    ],
    query: String,
    contextString: String,
    retrievedAt: Date,
    expiresAt: Date,
    fileIds: [String],
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversationDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },

    // Conversation Info
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: 'New Conversation',
    },
    messages: {
      type: [conversationMessageSchema],
      default: [],
    },

    // Metadata
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    // Context Caching (for optimization)
    cachedContext: {
      type: cachedContextSchema,
      required: false,
    },
    lastQueryEmbedding: {
      type: [Number],
      required: false,
    },

    // Audit
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

// Compound indexes for efficient queries
conversationSchema.index({ companyId: 1, deletedAt: 1 });
conversationSchema.index({ companyId: 1, userId: 1, deletedAt: 1 });
conversationSchema.index({ companyId: 1, projectId: 1, deletedAt: 1 });
conversationSchema.index({ companyId: 1, lastMessageAt: -1 });
conversationSchema.index({ deletedAt: 1 });

export const ConversationModel = model<IConversationDocument>('Conversation', conversationSchema);
