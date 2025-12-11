import { consumerChangeRepository } from '../../../src/repositories/consumer-change.repository';
import { ConsumerChangeModel } from '../../../src/models/consumer-change.model';
import { ChangeStatus, ChangeType } from '../../../src/types/enums';
import { Types } from 'mongoose';

// Mock Mongoose model
jest.mock('../../../src/models/consumer-change.model');

describe('ConsumerChangeRepository', () => {
  const mockChangeId = new Types.ObjectId().toString();
  const mockCompanyId = new Types.ObjectId().toString();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a consumer change record successfully', async () => {
      const mockData = {
        eventType: ChangeType.CONSISTENCY_CHECK,
        companyId: mockCompanyId,
        eventData: { fileId: 'file-123' },
        status: ChangeStatus.PENDING,
      };

      const mockSavedChange = {
        _id: new Types.ObjectId(mockChangeId),
        ...mockData,
        createdAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId(mockChangeId),
          ...mockData,
          createdAt: new Date(),
        }),
      };

      (ConsumerChangeModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedChange),
      }));

      const result = await consumerChangeRepository.create(mockData);

      expect(result).toHaveProperty('_id');
      expect(result.eventType).toBe(ChangeType.CONSISTENCY_CHECK);
      expect(ConsumerChangeModel).toHaveBeenCalledWith(mockData);
    });

    it('should handle save errors', async () => {
      const mockData = {
        eventType: ChangeType.CONSISTENCY_CHECK,
        companyId: mockCompanyId,
        eventData: {},
        status: ChangeStatus.PENDING,
      };

      (ConsumerChangeModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      await expect(consumerChangeRepository.create(mockData)).rejects.toThrow('Database error');
    });
  });

  describe('updateStatus', () => {
    const baseChange = {
      _id: new Types.ObjectId(mockChangeId),
      eventType: 'FILE_INDEXED',
      companyId: mockCompanyId,
      status: ChangeStatus.IN_PROGRESS,
    };

    it('should update status to IN_PROGRESS with startedAt', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue({
          ...baseChange,
          startedAt: new Date(),
        }),
      };

      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      const result = await consumerChangeRepository.updateStatus(
        mockChangeId,
        ChangeStatus.IN_PROGRESS
      );

      expect(result).toBeTruthy();
      expect(ConsumerChangeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockChangeId,
        {
          $set: expect.objectContaining({
            status: ChangeStatus.IN_PROGRESS,
            startedAt: expect.any(Date),
          }),
        },
        { new: true }
      );
    });

    it('should update status to COMPLETED with completedAt', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue({
          ...baseChange,
          status: ChangeStatus.COMPLETED,
          completedAt: new Date(),
        }),
      };

      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      const result = await consumerChangeRepository.updateStatus(
        mockChangeId,
        ChangeStatus.COMPLETED
      );

      expect(ConsumerChangeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockChangeId,
        {
          $set: expect.objectContaining({
            status: ChangeStatus.COMPLETED,
            completedAt: expect.any(Date),
          }),
        },
        { new: true }
      );
    });

    it('should update status to FAILED with error details', async () => {
      const errorMessage = 'Processing failed';
      const errorDetails = { stack: 'Error stack', code: 'ERR_001' };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue({
          ...baseChange,
          status: ChangeStatus.FAILED,
          error: errorMessage,
          errorDetails,
          completedAt: new Date(),
        }),
      };

      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      const result = await consumerChangeRepository.updateStatus(
        mockChangeId,
        ChangeStatus.FAILED,
        undefined,
        errorMessage,
        errorDetails
      );

      expect(result).toBeTruthy();
      expect(ConsumerChangeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockChangeId,
        {
          $set: expect.objectContaining({
            status: ChangeStatus.FAILED,
            error: errorMessage,
            errorDetails,
            completedAt: expect.any(Date),
          }),
        },
        { new: true }
      );
    });

    it('should update status with result data', async () => {
      const resultData = { vectorsCreated: 100, processingTime: 5000 };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue({
          ...baseChange,
          status: ChangeStatus.COMPLETED,
          result: resultData,
        }),
      };

      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      await consumerChangeRepository.updateStatus(mockChangeId, ChangeStatus.COMPLETED, resultData);

      expect(ConsumerChangeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockChangeId,
        {
          $set: expect.objectContaining({
            result: resultData,
          }),
        },
        { new: true }
      );
    });

    it('should return null when change not found', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };

      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue(mockQuery);

      const result = await consumerChangeRepository.updateStatus(
        'non-existent',
        ChangeStatus.COMPLETED
      );

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return change when found', async () => {
      const mockChange = {
        _id: new Types.ObjectId(mockChangeId),
        eventType: 'FILE_INDEXED',
        status: ChangeStatus.COMPLETED,
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockChange),
      };

      (ConsumerChangeModel.findById as jest.Mock).mockReturnValue(mockQuery);

      const result = await consumerChangeRepository.findById(mockChangeId);

      expect(result).toBeTruthy();
      expect(result?._id).toBe(mockChangeId);
    });

    it('should return null when not found', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };

      (ConsumerChangeModel.findById as jest.Mock).mockReturnValue(mockQuery);

      const result = await consumerChangeRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return paginated list of changes', async () => {
      const mockChanges = [
        { _id: new Types.ObjectId(), eventType: 'FILE_INDEXED', status: ChangeStatus.COMPLETED },
        { _id: new Types.ObjectId(), eventType: 'FILE_DELETED', status: ChangeStatus.PENDING },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockChanges),
      };

      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(100);

      const result = await consumerChangeRepository.list(1, 50);

      expect(result.changes).toHaveLength(2);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by eventType', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list(1, 50, { eventType: 'FILE_INDEXED' });

      expect(ConsumerChangeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'FILE_INDEXED' })
      );
    });

    it('should filter by status', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list(1, 50, { status: ChangeStatus.FAILED });

      expect(ConsumerChangeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: ChangeStatus.FAILED })
      );
    });

    it('should filter by companyId', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list(1, 50, { companyId: mockCompanyId });

      expect(ConsumerChangeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: mockCompanyId })
      );
    });

    it('should apply multiple filters', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list(1, 50, {
        eventType: 'FILE_INDEXED',
        status: ChangeStatus.COMPLETED,
        companyId: mockCompanyId,
      });

      expect(ConsumerChangeModel.find).toHaveBeenCalledWith({
        eventType: 'FILE_INDEXED',
        status: ChangeStatus.COMPLETED,
        companyId: mockCompanyId,
      });
    });

    it('should use default pagination values', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list();

      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });

    it('should sort by createdAt descending', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list();

      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(500);
      (ConsumerChangeModel.aggregate as jest.Mock)
        .mockResolvedValueOnce([
          { _id: 'FILE_INDEXED', count: 300 },
          { _id: 'FILE_DELETED', count: 200 },
        ])
        .mockResolvedValueOnce([
          { _id: ChangeStatus.COMPLETED, count: 400 },
          { _id: ChangeStatus.FAILED, count: 50 },
          { _id: ChangeStatus.PENDING, count: 50 },
        ]);

      const result = await consumerChangeRepository.getStats();

      expect(result.total).toBe(500);
      expect(result.byType).toEqual({
        FILE_INDEXED: 300,
        FILE_DELETED: 200,
      });
      expect(result.byStatus).toEqual({
        [ChangeStatus.COMPLETED]: 400,
        [ChangeStatus.FAILED]: 50,
        [ChangeStatus.PENDING]: 50,
      });
    });

    it('should filter stats by companyId', async () => {
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(100);
      (ConsumerChangeModel.aggregate as jest.Mock)
        .mockResolvedValueOnce([{ _id: 'FILE_INDEXED', count: 100 }])
        .mockResolvedValueOnce([{ _id: ChangeStatus.COMPLETED, count: 100 }]);

      await consumerChangeRepository.getStats(mockCompanyId);

      expect(ConsumerChangeModel.countDocuments).toHaveBeenCalledWith({ companyId: mockCompanyId });
      expect(ConsumerChangeModel.aggregate).toHaveBeenCalledWith([
        { $match: { companyId: mockCompanyId } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]);
    });

    it('should handle empty results', async () => {
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (ConsumerChangeModel.aggregate as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await consumerChangeRepository.getStats();

      expect(result).toEqual({
        total: 0,
        byType: {},
        byStatus: {},
      });
    });
  });
});
