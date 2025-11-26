import { apiLogRepository } from '../../../src/repositories/api-log.repository';
import { ApiLogModel } from '../../../src/models/api-log.model';

// Mock Mongoose model
jest.mock('../../../src/models/api-log.model');

describe('ApiLogRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create API log entry', async () => {
      const mockData = {
        companyId: 'company-123',
        method: 'POST',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 50,
        ipAddress: '127.0.0.1',
      };

      const mockSaved = {
        ...mockData,
        _id: { toString: () => 'log-123' },
        timestamp: new Date(),
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: 'log-123',
        }),
      };

      (ApiLogModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSaved),
      }));

      const result = await apiLogRepository.create(mockData);

      expect(ApiLogModel).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(
        expect.objectContaining({
          method: mockData.method,
          endpoint: mockData.endpoint,
        })
      );
    });
  });

  describe('findByCompanyId', () => {
    it('should find logs by company with pagination', async () => {
      const mockLogs = [
        {
          _id: { toString: () => 'log-1' },
          method: 'GET',
          endpoint: '/api/test',
        },
      ];

      (ApiLogModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockLogs),
            }),
          }),
        }),
      });

      (ApiLogModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(10);

      const result = await apiLogRepository.findByCompanyId('company-123', 1, 50);

      expect(ApiLogModel.find).toHaveBeenCalledWith({ companyId: 'company-123' });
      expect(result.logs).toBeDefined();
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
    });
  });

  describe('findErrors', () => {
    it('should find error logs (status >= 400)', async () => {
      const mockLogs = [
        {
          _id: { toString: () => 'log-1' },
          statusCode: 404,
          endpoint: '/api/not-found',
        },
      ];

      (ApiLogModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockLogs),
            }),
          }),
        }),
      });

      (ApiLogModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await apiLogRepository.findErrors('company-123', 1, 50);

      expect(ApiLogModel.find).toHaveBeenCalledWith({
        companyId: 'company-123',
        statusCode: { $gte: 400 },
      });
      expect(result.logs).toBeDefined();
      expect(result.total).toBe(1);
    });
  });

  describe('getUsageStats', () => {
    it('should get usage statistics', async () => {
      const mockStats = [
        {
          _id: null,
          totalRequests: 100,
          successfulRequests: 90,
          failedRequests: 10,
          avgResponseTime: 50,
          totalRequestSize: 5000,
          totalResponseSize: 50000,
        },
      ];

      (ApiLogModel.aggregate as jest.Mock) = jest.fn().mockResolvedValue(mockStats);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const result = await apiLogRepository.getUsageStats('company-123', startDate, endDate);

      expect(result.totalRequests).toBe(100);
      expect(result.successfulRequests).toBe(90);
      expect(result.failedRequests).toBe(10);
      expect(result.avgResponseTime).toBe(50);
      expect(result.totalDataTransferred).toBe(55000);
    });

    it('should return zeros if no stats', async () => {
      (ApiLogModel.aggregate as jest.Mock) = jest.fn().mockResolvedValue([]);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const result = await apiLogRepository.getUsageStats('company-123', startDate, endDate);

      expect(result.totalRequests).toBe(0);
      expect(result.successfulRequests).toBe(0);
      expect(result.failedRequests).toBe(0);
    });
  });

  describe('getEndpointStats', () => {
    it('should get endpoint usage breakdown', async () => {
      const mockStats = [
        { endpoint: '/api/test', count: 50, avgResponseTime: 45 },
        { endpoint: '/api/search', count: 30, avgResponseTime: 60 },
      ];

      (ApiLogModel.aggregate as jest.Mock) = jest.fn().mockResolvedValue(mockStats);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const result = await apiLogRepository.getEndpointStats('company-123', startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('count', () => {
    it('should count logs for a company', async () => {
      (ApiLogModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(100);

      const count = await apiLogRepository.count('company-123');

      expect(ApiLogModel.countDocuments).toHaveBeenCalledWith({ companyId: 'company-123' });
      expect(count).toBe(100);
    });

    it('should count all logs if no company specified', async () => {
      (ApiLogModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(500);

      const count = await apiLogRepository.count();

      expect(ApiLogModel.countDocuments).toHaveBeenCalledWith();
      expect(count).toBe(500);
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than specified days', async () => {
      (ApiLogModel.deleteMany as jest.Mock) = jest.fn().mockResolvedValue({ deletedCount: 10 });

      const result = await apiLogRepository.deleteOldLogs(90);

      expect(ApiLogModel.deleteMany).toHaveBeenCalledWith({
        timestamp: { $lt: expect.any(Date) },
      });
      expect(result).toBe(10);
    });
  });
});
