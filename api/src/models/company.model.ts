import { Schema, model, Document } from 'mongoose';
import { ICompany } from '../schemas/company.schema';
import { SubscriptionTier, CompanyStatus } from '@rag/types';

export interface ICompanyDocument extends Omit<ICompany, '_id'>, Document {}

const companySchema = new Schema<ICompanyDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Subscription & Limits
    subscriptionTier: {
      type: String,
      enum: Object.values(SubscriptionTier),
      default: SubscriptionTier.FREE,
    },
    storageLimit: {
      type: Number,
      default: 5368709120, // 5GB in bytes
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    maxUsers: {
      type: Number,
      default: 5,
    },
    maxProjects: {
      type: Number,
      default: 10,
    },

    // API Access
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    apiKeyHash: {
      type: String,
      required: true,
    },
    apiKeyLastUsed: {
      type: Date,
    },

    // Status & Settings
    status: {
      type: String,
      enum: Object.values(CompanyStatus),
      default: CompanyStatus.ACTIVE,
    },
    settings: {
      type: Schema.Types.Mixed,
    },

    // Soft delete
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'companies',
  }
);

// Indexes
companySchema.index({ status: 1 });
companySchema.index({ deletedAt: 1 });
companySchema.index({ createdAt: 1 });
companySchema.index({ apiKeyHash: 1 }); // For API key validation lookups

// Pre-save hook to ensure slug is lowercase
companySchema.pre('save', function (next) {
  if (this.slug) {
    this.slug = this.slug.toLowerCase();
  }
  next();
});

export const CompanyModel = model<ICompanyDocument>('Company', companySchema);
