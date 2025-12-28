import {
  ConsumerChangeModel,
  CreateConsumerChangeDTO,
  IConsumerChange,
} from '../models/consumer-change.model';
import { ChangeStatus } from '@rag/types';
import { toStringId } from './helpers';

export class ConsumerChangeRepository {
  /**
   * Create a new consumer change record
   */
  async create(data: CreateConsumerChangeDTO): Promise<IConsumerChange> {
    const change = new ConsumerChangeModel(data);
    const saved = await change.save();
    return toStringId(saved.toObject()) as unknown as IConsumerChange;
  }

  /**
   * Update change status
   */
  async updateStatus(
    id: string,
    status: ChangeStatus,
    result?: Record<string, unknown>,
    error?: string,
    errorDetails?: Record<string, unknown>
  ): Promise<IConsumerChange | null> {
    const update: Record<string, unknown> = {
      status,
    };

    if (status === ChangeStatus.IN_PROGRESS) {
      update.startedAt = new Date();
    } else if (status === ChangeStatus.COMPLETED || status === ChangeStatus.FAILED) {
      update.completedAt = new Date();
    }

    if (result) {
      update.result = result;
    }

    if (error) {
      update.error = error;
    }

    if (errorDetails) {
      update.errorDetails = errorDetails;
    }

    const change = await ConsumerChangeModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();

    if (!change) return null;
    return toStringId(change) as unknown as IConsumerChange;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<IConsumerChange | null> {
    const change = await ConsumerChangeModel.findById(id).lean();
    if (!change) return null;
    return toStringId(change) as unknown as IConsumerChange;
  }

  /**
   * List changes with pagination
   */
  async list(
    page: number = 1,
    limit: number = 50,
    filters?: {
      eventType?: string;
      status?: string;
      companyId?: string;
    }
  ): Promise<{
    changes: IConsumerChange[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filters?.eventType) {
      query.eventType = filters.eventType;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.companyId) {
      query.companyId = filters.companyId;
    }

    const skip = (page - 1) * limit;

    const [changes, total] = await Promise.all([
      ConsumerChangeModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ConsumerChangeModel.countDocuments(query),
    ]);

    return {
      changes: changes.map((c) => toStringId(c) as unknown as IConsumerChange),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get statistics
   */
  async getStats(companyId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const query: Record<string, unknown> = {};
    if (companyId) {
      query.companyId = companyId;
    }

    const [total, byType, byStatus] = await Promise.all([
      ConsumerChangeModel.countDocuments(query),
      ConsumerChangeModel.aggregate([
        { $match: query },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]),
      ConsumerChangeModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byType: byType.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}

export const consumerChangeRepository = new ConsumerChangeRepository();
