import { ApiLogModel } from '../models/api-log.model';
import { CreateApiLogDTO, IApiLog } from '../schemas/api-log.schema';
import { toStringId, toStringIds } from './helpers';

export class ApiLogRepository {
  /**
   * Create new API log entry
   */
  async create(data: CreateApiLogDTO): Promise<IApiLog> {
    const apiLog = new ApiLogModel(data);
    const saved = await apiLog.save();
    return toStringId(saved.toObject()) as unknown as IApiLog;
  }

  /**
   * Find logs by company ID
   */
  async findByCompanyId(
    companyId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: IApiLog[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ApiLogModel.find({ companyId }).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      ApiLogModel.countDocuments({ companyId }),
    ]);

    return {
      logs: toStringIds(logs) as unknown as IApiLog[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find logs by endpoint
   */
  async findByEndpoint(
    endpoint: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: IApiLog[]; total: number }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ApiLogModel.find({ endpoint }).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      ApiLogModel.countDocuments({ endpoint }),
    ]);

    return {
      logs: toStringIds(logs) as unknown as IApiLog[],
      total,
    };
  }

  /**
   * Find logs by date range
   */
  async findByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<IApiLog[]> {
    const logs = await ApiLogModel.find({
      companyId,
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .sort({ timestamp: -1 })
      .lean();

    return toStringIds(logs) as unknown as IApiLog[];
  }

  /**
   * Find error logs (status code >= 400)
   */
  async findErrors(
    companyId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: IApiLog[]; total: number }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ApiLogModel.find({
        companyId,
        statusCode: { $gte: 400 },
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ApiLogModel.countDocuments({
        companyId,
        statusCode: { $gte: 400 },
      }),
    ]);

    return {
      logs: toStringIds(logs) as unknown as IApiLog[],
      total,
    };
  }

  /**
   * Get API usage statistics
   */
  async getUsageStats(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    totalDataTransferred: number;
  }> {
    const result = await ApiLogModel.aggregate([
      {
        $match: {
          companyId: companyId,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          successfulRequests: {
            $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] },
          },
          failedRequests: {
            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
          },
          avgResponseTime: { $avg: '$responseTime' },
          totalRequestSize: { $sum: '$requestSize' },
          totalResponseSize: { $sum: '$responseSize' },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        totalDataTransferred: 0,
      };
    }

    const stats = result[0];
    return {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      avgResponseTime: Math.round(stats.avgResponseTime),
      totalDataTransferred: (stats.totalRequestSize || 0) + (stats.totalResponseSize || 0),
    };
  }

  /**
   * Get endpoint usage breakdown
   */
  async getEndpointStats(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ endpoint: string; count: number; avgResponseTime: number }>> {
    const result = await ApiLogModel.aggregate([
      {
        $match: {
          companyId: companyId,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 20,
      },
      {
        $project: {
          _id: 0,
          endpoint: '$_id',
          count: 1,
          avgResponseTime: { $round: ['$avgResponseTime', 0] },
        },
      },
    ]);

    return result;
  }

  /**
   * Get hourly request distribution
   */
  async getHourlyDistribution(
    companyId: string,
    date: Date
  ): Promise<Array<{ hour: number; count: number }>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await ApiLogModel.aggregate([
      {
        $match: {
          companyId: companyId,
          timestamp: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          count: 1,
        },
      },
    ]);

    return result;
  }

  /**
   * Delete old logs (called manually if needed, TTL index handles automatic deletion)
   */
  async deleteOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await ApiLogModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  /**
   * Count total logs
   */
  async count(companyId?: string): Promise<number> {
    if (companyId) {
      return ApiLogModel.countDocuments({ companyId });
    }
    return ApiLogModel.countDocuments();
  }
}

// Export singleton instance
export const apiLogRepository = new ApiLogRepository();
