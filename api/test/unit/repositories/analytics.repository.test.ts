import { analyticsRepository } from '../../../src/repositories/analytics.repository';
import { AnalyticsModel } from '../../../src/models/analytics.model';

// Mock the model
jest.mock('../../../src/models/analytics.model');

describe('AnalyticsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an analytics entry', async () => {
      const mockAnalytics = {
        _id: '507f1f77bcf86cd799439011',
        companyId: '507f191e810c19729de860ea',
        eventType: 'search',
        metadata: { query: 'test' },
        timestamp: new Date(),
      };

      (AnalyticsModel.create as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await analyticsRepository.create({
        companyId: '507f191e810c19729de860ea',
        eventType: 'search',
        metadata: { query: 'test' },
      });

      expect(result).toEqual(mockAnalytics);
      expect(AnalyticsModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: '507f191e810c19729de860ea',
          eventType: 'search',
          metadata: { query: 'test' },
        })
      );
    });

    it('should handle errors', async () => {
      (AnalyticsModel.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        analyticsRepository.create({
          companyId: '507f191e810c19729de860ea',
          eventType: 'search',
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('query', () => {
    it('should query analytics entries', async () => {
      const mockAnalytics = [
        {
          companyId: '507f191e810c19729de860ea',
          eventType: 'search',
          timestamp: new Date(),
        },
      ];

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAnalytics),
      };

      (AnalyticsModel.find as jest.Mock).mockReturnValue(mockFind);

      const result = await analyticsRepository.query({
        companyId: '507f191e810c19729de860ea',
        eventType: 'search',
      });

      expect(result).toEqual(mockAnalytics);
      expect(AnalyticsModel.find).toHaveBeenCalledWith({
        companyId: '507f191e810c19729de860ea',
        eventType: 'search',
      });
    });

    it('should support date range queries', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (AnalyticsModel.find as jest.Mock).mockReturnValue(mockFind);

      await analyticsRepository.query({
        companyId: '507f191e810c19729de860ea',
        startDate,
        endDate,
      });

      expect(AnalyticsModel.find).toHaveBeenCalledWith({
        companyId: '507f191e810c19729de860ea',
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    });
  });

  describe('getEventCount', () => {
    it('should return event count', async () => {
      (AnalyticsModel.countDocuments as jest.Mock).mockResolvedValue(42);

      const result = await analyticsRepository.getEventCount('507f191e810c19729de860ea');

      expect(result).toBe(42);
      expect(AnalyticsModel.countDocuments).toHaveBeenCalledWith({
        companyId: '507f191e810c19729de860ea',
      });
    });

    it('should filter by event type', async () => {
      (AnalyticsModel.countDocuments as jest.Mock).mockResolvedValue(10);

      await analyticsRepository.getEventCount('507f191e810c19729de860ea', 'search');

      expect(AnalyticsModel.countDocuments).toHaveBeenCalledWith({
        companyId: '507f191e810c19729de860ea',
        eventType: 'search',
      });
    });
  });

  describe('deleteByCompany', () => {
    it('should delete analytics for a company', async () => {
      (AnalyticsModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 });

      const result = await analyticsRepository.deleteByCompany('507f191e810c19729de860ea');

      expect(result).toBe(5);
      expect(AnalyticsModel.deleteMany).toHaveBeenCalledWith({
        companyId: '507f191e810c19729de860ea',
      });
    });

    it('should return 0 if no documents deleted', async () => {
      (AnalyticsModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      const result = await analyticsRepository.deleteByCompany('507f191e810c19729de860ea');

      expect(result).toBe(0);
    });
  });
});
