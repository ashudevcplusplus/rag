import { Schema, model, Document, Types } from 'mongoose';
import { z } from 'zod';
import { ChangeType, ChangeStatus } from '@rag/types';

// TypeScript Interface
export interface IConsumerChange {
  _id: string;
  eventType: ChangeType;
  status: ChangeStatus;
  companyId?: string;
  companyName?: string;

  // Event data
  eventData: {
    companyId?: string;
    fileIds?: string[];
    [key: string]: unknown;
  };

  // Results
  result?: {
    vectorsDeleted?: number;
    filesProcessed?: number;
    orphanedFiles?: string[];
    discrepancies?: Array<{
      companyId: string;
      companyName: string;
      issues: string[];
      dbVectorCount: number;
      qdrantVectorCount: number;
    }>;
    [key: string]: unknown;
  };

  // Error handling
  error?: string;
  errorDetails?: Record<string, unknown>;

  // Metadata
  metadata?: {
    jobId?: string;
    triggeredBy?: string;
    [key: string]: unknown;
  };

  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Zod Schema
export const consumerChangeZodSchema = z.object({
  eventType: z.nativeEnum(ChangeType),
  status: z.nativeEnum(ChangeStatus).default(ChangeStatus.PENDING),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  eventData: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  errorDetails: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateConsumerChangeDTO = z.infer<typeof consumerChangeZodSchema>;

// Mongoose Document Interface
export interface IConsumerChangeDocument
  extends Omit<IConsumerChange, '_id' | 'companyId'>, Document {
  companyId?: Types.ObjectId;
}

const consumerChangeSchema = new Schema<IConsumerChangeDocument>(
  {
    eventType: {
      type: String,
      enum: Object.values(ChangeType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ChangeStatus),
      default: ChangeStatus.PENDING,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    companyName: {
      type: String,
    },
    eventData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    result: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    errorDetails: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'consumer_changes',
  }
);

// Indexes
consumerChangeSchema.index({ eventType: 1, status: 1 });
consumerChangeSchema.index({ companyId: 1, createdAt: -1 });
consumerChangeSchema.index({ createdAt: -1 });
consumerChangeSchema.index({ status: 1, createdAt: -1 });

export const ConsumerChangeModel = model<IConsumerChangeDocument>(
  'ConsumerChange',
  consumerChangeSchema
);
