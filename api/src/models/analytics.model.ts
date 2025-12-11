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
      index: true,
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
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

export const AnalyticsModel = mongoose.model<IAnalytics>('Analytics', analyticsSchema);
