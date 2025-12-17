import { NewsletterModel, INewsletterDocument } from '../models/newsletter.model';
import { SubscribeNewsletterDTO, INewsletter } from '../schemas/newsletter.schema';
import { Model } from 'mongoose';
import { toStringId, toStringIds } from './helpers';

export class NewsletterRepository {
  public model: Model<INewsletterDocument>;

  constructor() {
    this.model = NewsletterModel;
  }

  /**
   * Subscribe to newsletter (or resubscribe if already exists)
   */
  async subscribe(data: SubscribeNewsletterDTO): Promise<{ subscriber: INewsletter; isNew: boolean }> {
    const existing = await NewsletterModel.findOne({ email: data.email });

    if (existing) {
      // Resubscribe if previously unsubscribed
      if (!existing.isSubscribed) {
        existing.isSubscribed = true;
        existing.subscribedAt = new Date();
        existing.unsubscribedAt = undefined;
        await existing.save();
      }
      return {
        subscriber: toStringId(existing.toObject()) as unknown as INewsletter,
        isNew: false,
      };
    }

    const subscriber = new NewsletterModel({
      email: data.email,
      isSubscribed: true,
      subscribedAt: new Date(),
    });
    const saved = await subscriber.save();
    return {
      subscriber: toStringId(saved.toObject()) as unknown as INewsletter,
      isNew: true,
    };
  }

  /**
   * Unsubscribe from newsletter
   * @returns true if unsubscribed, false if not found
   */
  async unsubscribe(email: string): Promise<boolean> {
    const result = await NewsletterModel.findOneAndUpdate(
      { email },
      {
        $set: {
          isSubscribed: false,
          unsubscribedAt: new Date(),
        },
      },
      { new: true }
    );
    return !!result;
  }

  /**
   * Find subscriber by email
   */
  async findByEmail(email: string): Promise<INewsletter | null> {
    const subscriber = await NewsletterModel.findOne({ email }).lean();
    if (!subscriber) return null;
    return toStringId(subscriber) as unknown as INewsletter;
  }

  /**
   * List subscribers with pagination
   */
  async list(
    page: number = 1,
    limit: number = 50,
    filters?: { isSubscribed?: boolean }
  ): Promise<{
    subscribers: INewsletter[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filters?.isSubscribed !== undefined) {
      query.isSubscribed = filters.isSubscribed;
    }

    const skip = (page - 1) * limit;

    const [subscribers, total] = await Promise.all([
      NewsletterModel.find(query).sort({ subscribedAt: -1 }).skip(skip).limit(limit).lean(),
      NewsletterModel.countDocuments(query),
    ]);

    return {
      subscribers: toStringIds(subscribers) as unknown as INewsletter[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get newsletter stats
   */
  async getStats(): Promise<{ total: number; active: number; unsubscribed: number }> {
    const [total, active, unsubscribed] = await Promise.all([
      NewsletterModel.countDocuments({}),
      NewsletterModel.countDocuments({ isSubscribed: true }),
      NewsletterModel.countDocuments({ isSubscribed: false }),
    ]);

    return {
      total,
      active,
      unsubscribed,
    };
  }
}

export const newsletterRepository = new NewsletterRepository();

