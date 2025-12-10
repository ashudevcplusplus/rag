import { AnalyticsModel, IAnalytics } from '../models/analytics.model';
import { logger } from '../utils/logger';

export interface CreateAnalyticsDTO {
  companyId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AnalyticsQueryDTO {
  companyId: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface AnalyticsAggregateDTO {
  companyId: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'hour' | 'eventType';
}

class AnalyticsRepository {
  /**
   * Create a new analytics entry
   */
  async create(data: CreateAnalyticsDTO): Promise<IAnalytics> {
    try {
      const analytics = await AnalyticsModel.create({
        companyId: data.companyId,
        eventType: data.eventType,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date(),
      });
      return analytics;
    } catch (error) {
      logger.error('Failed to create analytics entry', { error, data });
      throw error;
    }
  }

  /**
   * Query analytics entries
   */
  async query(params: AnalyticsQueryDTO): Promise<IAnalytics[]> {
    try {
      const query: Record<string, unknown> = {
        companyId: params.companyId,
      };

      if (params.eventType) {
        query.eventType = params.eventType;
      }

      if (params.startDate || params.endDate) {
        query.timestamp = {};
        if (params.startDate) {
          (query.timestamp as Record<string, Date>).$gte = params.startDate;
        }
        if (params.endDate) {
          (query.timestamp as Record<string, Date>).$lte = params.endDate;
        }
      }

      const results = await AnalyticsModel.find(query)
        .sort({ timestamp: -1 })
        .limit(params.limit || 1000)
        .lean();

      return results as unknown as IAnalytics[];
    } catch (error) {
      logger.error('Failed to query analytics', { error, params });
      throw error;
    }
  }

  /**
   * Get aggregated analytics
   */
  async aggregate(params: AnalyticsAggregateDTO): Promise<unknown[]> {
    try {
      const matchStage: Record<string, unknown> = {
        companyId: params.companyId,
      };

      if (params.eventType) {
        matchStage.eventType = params.eventType;
      }

      if (params.startDate || params.endDate) {
        matchStage.timestamp = {};
        if (params.startDate) {
          (matchStage.timestamp as Record<string, Date>).$gte = params.startDate;
        }
        if (params.endDate) {
          (matchStage.timestamp as Record<string, Date>).$lte = params.endDate;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let groupStage: any = {};

      if (params.groupBy === 'day') {
        groupStage = {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        };
      } else if (params.groupBy === 'hour') {
        groupStage = {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        };
      } else if (params.groupBy === 'eventType') {
        groupStage = {
          _id: '$eventType',
          count: { $sum: 1 },
        };
      } else {
        // Default: group by event type
        groupStage = {
          _id: '$eventType',
          count: { $sum: 1 },
        };
      }

      return await AnalyticsModel.aggregate([
        { $match: matchStage },
        { $group: groupStage },
        { $sort: { count: -1 } },
      ]);
    } catch (error) {
      logger.error('Failed to aggregate analytics', { error, params });
      throw error;
    }
  }

  /**
   * Get event count for a company
   */
  async getEventCount(companyId: string, eventType?: string): Promise<number> {
    try {
      const query: Record<string, string> = { companyId };
      if (eventType) {
        query.eventType = eventType;
      }
      return await AnalyticsModel.countDocuments(query);
    } catch (error) {
      logger.error('Failed to get event count', { error, companyId, eventType });
      throw error;
    }
  }

  /**
   * Delete analytics for a company
   */
  async deleteByCompany(companyId: string): Promise<number> {
    try {
      const result = await AnalyticsModel.deleteMany({ companyId });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Failed to delete analytics', { error, companyId });
      throw error;
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();
