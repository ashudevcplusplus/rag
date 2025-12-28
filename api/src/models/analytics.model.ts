import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAnalytics extends Document {
  companyId: Types.ObjectId;
  eventType: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

const analyticsSchema = new Schema<IAnalytics>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'analytics',
  }
);

// Compound index for common queries
analyticsSchema.index({ companyId: 1, eventType: 1, timestamp: -1 });

// TTL index - auto-delete analytics data older than 90 days
// The compound index { companyId: 1, eventType: 1, timestamp: -1 } cannot be used for TTL, so we need this standalone index
// Using a unique index name to avoid Mongoose duplicate index warnings
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000, name: 'timestamp_ttl' }); // 90 days

export const AnalyticsModel = mongoose.model<IAnalytics>('Analytics', analyticsSchema);
