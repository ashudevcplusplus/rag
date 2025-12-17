import { Schema, model, Document } from 'mongoose';
import { INewsletter } from '../schemas/newsletter.schema';

export interface INewsletterDocument extends Omit<INewsletter, '_id'>, Document {}

const newsletterSchema = new Schema<INewsletterDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isSubscribed: {
      type: Boolean,
      default: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'newsletter_subscribers',
  }
);

// Indexes
newsletterSchema.index({ isSubscribed: 1 });
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ subscribedAt: -1 });

export const NewsletterModel = model<INewsletterDocument>('Newsletter', newsletterSchema);

