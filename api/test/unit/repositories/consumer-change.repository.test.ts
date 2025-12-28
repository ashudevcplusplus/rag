import { consumerChangeRepository } from '../../../src/repositories/consumer-change.repository';
import { ConsumerChangeModel } from '../../../src/models/consumer-change.model';
import { ChangeStatus, ChangeType } from '@rag/types';
import {
  createObjectId,
  generateObjectId,
  createMockConsumerChange,
  createMockMongooseQuery,
} from '../../lib/mock-utils';

// Mock Mongoose model
jest.mock('../../../src/models/consumer-change.model');

interface MockConsumerChangeDocument {
  _id: ReturnType<typeof createObjectId>;
  eventType: ChangeType;
  status: ChangeStatus;
  companyId: string;
  eventData: Record<string, unknown>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: Record<string, unknown>;
  error?: string;
  errorDetails?: Record<string, unknown>;
}

describe('ConsumerChangeRepository', () => {
  const mockChangeId = generateObjectId();
  const mockCompanyId = generateObjectId();

  const mockChange: MockConsumerChangeDocument = {
    _id: createObjectId(mockChangeId),
    eventType: ChangeType.CONSISTENCY_CHECK,
    status: ChangeStatus.PENDING,
    companyId: mockCompanyId,
    eventData: { fileId: 'file-123' },
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new consumer change record', async () => {
      const mockData = {
        eventType: ChangeType.CONSISTENCY_CHECK,
        status: ChangeStatus.PENDING,
        companyId: mockCompanyId,
        eventData: { fileId: 'file-123' },
      };

      const mockSavedChange = {
        ...mockData,
        _id: createObjectId(),
        createdAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: createObjectId(),
          ...mockData,
        }),
      };

      (ConsumerChangeModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedChange),
      }));

      const result = await consumerChangeRepository.create(mockData);

      expect(result).toHaveProperty('eventType', ChangeType.CONSISTENCY_CHECK);
      expect(ConsumerChangeModel).toHaveBeenCalledWith(mockData);
    });
  });

  describe('updateStatus', () => {
    it('should update status to IN_PROGRESS with startedAt', async () => {
      const updatedChange: MockConsumerChangeDocument = {
        ...mockChange,
        status: ChangeStatus.IN_PROGRESS,
        startedAt: new Date(),
      };

      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedChange),
      });

      const result = await consumerChangeRepository.updateStatus(
        mockChangeId,
        ChangeStatus.IN_PROGRESS
      );

      expect(result).toBeDefined();
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
      const updatedChange: MockConsumerChangeDocument = {
        ...mockChange,
        status: ChangeStatus.COMPLETED,
        completedAt: new Date(),
      };

      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedChange),
      });

      const result = await consumerChangeRepository.updateStatus(
        mockChangeId,
        ChangeStatus.COMPLETED,
        { processed: true }
      );

      expect(result).toBeDefined();
      expect(ConsumerChangeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockChangeId,
        {
          $set: expect.objectContaining({
            status: ChangeStatus.COMPLETED,
            completedAt: expect.any(Date),
            result: { processed: true },
          }),
        },
        { new: true }
      );
    });

    it('should update status to FAILED with error details', async () => {
      const updatedChange: MockConsumerChangeDocument = {
        ...mockChange,
        status: ChangeStatus.FAILED,
        completedAt: new Date(),
        error: 'Processing failed',
        errorDetails: { code: 'ERR_001' },
      };

      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedChange),
      });

      const result = await consumerChangeRepository.updateStatus(
        mockChangeId,
        ChangeStatus.FAILED,
        undefined,
        'Processing failed',
        { code: 'ERR_001' }
      );

      expect(result).toBeDefined();
      expect(ConsumerChangeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockChangeId,
        {
          $set: expect.objectContaining({
            status: ChangeStatus.FAILED,
            completedAt: expect.any(Date),
            error: 'Processing failed',
            errorDetails: { code: 'ERR_001' },
          }),
        },
        { new: true }
      );
    });

    it('should return null if change not found', async () => {
      (ConsumerChangeModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await consumerChangeRepository.updateStatus(
        'non-existent',
        ChangeStatus.COMPLETED
      );

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return change if found', async () => {
      (ConsumerChangeModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockChange),
      });

      const result = await consumerChangeRepository.findById(mockChangeId);

      expect(result).toBeDefined();
      expect(ConsumerChangeModel.findById).toHaveBeenCalledWith(mockChangeId);
    });

    it('should return null if not found', async () => {
      (ConsumerChangeModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await consumerChangeRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return paginated list of changes', async () => {
      const mockChanges = [mockChange];

      const mockQuery = createMockMongooseQuery(mockChanges);
      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await consumerChangeRepository.list(1, 50);

      expect(result).toEqual({
        changes: expect.any(Array),
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });

    it('should apply eventType filter', async () => {
      const mockQuery = createMockMongooseQuery([]);
      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list(1, 50, { eventType: ChangeType.CONSISTENCY_CHECK });

      expect(ConsumerChangeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ChangeType.CONSISTENCY_CHECK })
      );
    });

    it('should apply status filter', async () => {
      const mockQuery = createMockMongooseQuery([]);
      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list(1, 50, { status: ChangeStatus.COMPLETED });

      expect(ConsumerChangeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: ChangeStatus.COMPLETED })
      );
    });

    it('should apply companyId filter', async () => {
      const mockQuery = createMockMongooseQuery([]);
      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await consumerChangeRepository.list(1, 50, { companyId: mockCompanyId });

      expect(ConsumerChangeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: mockCompanyId })
      );
    });

    it('should handle pagination correctly', async () => {
      const mockQuery = createMockMongooseQuery([]);
      (ConsumerChangeModel.find as jest.Mock).mockReturnValue(mockQuery);
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(100);

      const result = await consumerChangeRepository.list(3, 20);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      expect(mockQuery.skip).toHaveBeenCalledWith(40); // (3-1) * 20
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(100);
      (ConsumerChangeModel.aggregate as jest.Mock)
        .mockResolvedValueOnce([
          { _id: ChangeType.CONSISTENCY_CHECK, count: 50 },
          { _id: ChangeType.CLEANUP_ORPHANED, count: 30 },
          { _id: ChangeType.VECTOR_DELETED, count: 20 },
        ])
        .mockResolvedValueOnce([
          { _id: ChangeStatus.COMPLETED, count: 80 },
          { _id: ChangeStatus.FAILED, count: 15 },
          { _id: ChangeStatus.PENDING, count: 5 },
        ]);

      const result = await consumerChangeRepository.getStats();

      expect(result).toEqual({
        total: 100,
        byType: {
          [ChangeType.CONSISTENCY_CHECK]: 50,
          [ChangeType.CLEANUP_ORPHANED]: 30,
          [ChangeType.VECTOR_DELETED]: 20,
        },
        byStatus: {
          [ChangeStatus.COMPLETED]: 80,
          [ChangeStatus.FAILED]: 15,
          [ChangeStatus.PENDING]: 5,
        },
      });
    });

    it('should filter by companyId when provided', async () => {
      (ConsumerChangeModel.countDocuments as jest.Mock).mockResolvedValue(10);
      (ConsumerChangeModel.aggregate as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await consumerChangeRepository.getStats(mockCompanyId);

      expect(ConsumerChangeModel.countDocuments).toHaveBeenCalledWith({ companyId: mockCompanyId });
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
