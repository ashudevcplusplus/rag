import { Schema, model, Document, Types } from 'mongoose';
import { IApiLog } from '../schemas/api-log.schema';

export interface IApiLogDocument extends Omit<IApiLog, '_id' | 'companyId'>, Document {
  companyId: Types.ObjectId;
}

const apiLogSchema = new Schema<IApiLogDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    // Request Info
    method: {
      type: String,
      required: true,
      maxlength: 10,
    },
    endpoint: {
      type: String,
      required: true,
      maxlength: 500,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },

    // Usage Tracking
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    apiKey: {
      type: String,
    },

    // Metadata
    requestSize: {
      type: Number,
    },
    responseSize: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: 'api_logs',
  }
);

// Indexes for querying
apiLogSchema.index({ companyId: 1, timestamp: -1 });
apiLogSchema.index({ endpoint: 1 });
apiLogSchema.index({ timestamp: -1 });
apiLogSchema.index({ companyId: 1, statusCode: 1 });

// TTL index - auto-delete logs older than 90 days (7776000 seconds)
apiLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export const ApiLogModel = model<IApiLogDocument>('ApiLog', apiLogSchema);
