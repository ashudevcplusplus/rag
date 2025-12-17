import { newsletterRepository } from '../../../src/repositories/newsletter.repository';
import { NewsletterModel } from '../../../src/models/newsletter.model';
import { Types } from 'mongoose';
import { SubscribeNewsletterDTO } from '../../../src/schemas/newsletter.schema';

// Mock Mongoose model
jest.mock('../../../src/models/newsletter.model');

describe('NewsletterRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should create a new subscriber', async () => {
      const mockData: SubscribeNewsletterDTO = {
        email: 'new@example.com',
      };

      const mockSavedSubscriber = {
        ...mockData,
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        isSubscribed: true,
        subscribedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          isSubscribed: true,
          subscribedAt: new Date(),
        }),
      };

      (NewsletterModel.findOne as jest.Mock).mockResolvedValue(null);
      (NewsletterModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedSubscriber),
      }));

      const result = await newsletterRepository.subscribe(mockData);

      expect(result.isNew).toBe(true);
      expect(result.subscriber).toEqual(
        expect.objectContaining({
          email: mockData.email,
          _id: '5f8d04b3b54764421b7156c1',
        })
      );
    });

    it('should return existing subscriber if already subscribed', async () => {
      const mockData: SubscribeNewsletterDTO = {
        email: 'existing@example.com',
      };

      const mockExistingSubscriber = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        email: 'existing@example.com',
        isSubscribed: true,
        subscribedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          email: 'existing@example.com',
          isSubscribed: true,
        }),
        save: jest.fn().mockResolvedValue(undefined),
      };

      (NewsletterModel.findOne as jest.Mock).mockResolvedValue(mockExistingSubscriber);

      const result = await newsletterRepository.subscribe(mockData);

      expect(result.isNew).toBe(false);
      expect(result.subscriber.email).toBe(mockData.email);
      expect(mockExistingSubscriber.save).not.toHaveBeenCalled();
    });

    it('should resubscribe if previously unsubscribed', async () => {
      const mockData: SubscribeNewsletterDTO = {
        email: 'unsubscribed@example.com',
      };

      const mockUnsubscribed = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        email: 'unsubscribed@example.com',
        isSubscribed: false,
        subscribedAt: new Date('2023-01-01'),
        unsubscribedAt: new Date('2023-06-01'),
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          email: 'unsubscribed@example.com',
          isSubscribed: true,
        }),
        save: jest.fn().mockResolvedValue(undefined),
      };

      (NewsletterModel.findOne as jest.Mock).mockResolvedValue(mockUnsubscribed);

      const result = await newsletterRepository.subscribe(mockData);

      expect(result.isNew).toBe(false);
      expect(mockUnsubscribed.isSubscribed).toBe(true);
      expect(mockUnsubscribed.unsubscribedAt).toBeUndefined();
      expect(mockUnsubscribed.save).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe an existing subscriber', async () => {
      const mockUnsubscribed = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        email: 'test@example.com',
      };

      (NewsletterModel.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUnsubscribed);

      const result = await newsletterRepository.unsubscribe('test@example.com');

      expect(result).toBe(true);
      expect(NewsletterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        {
          $set: {
            isSubscribed: false,
            unsubscribedAt: expect.any(Date),
          },
        }
      );
    });

    it('should return false if subscriber not found', async () => {
      (NewsletterModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await newsletterRepository.unsubscribe('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('findByEmail', () => {
    it('should find subscriber by email', async () => {
      const mockSubscriber = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        email: 'test@example.com',
        isSubscribed: true,
      };

      (NewsletterModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSubscriber),
      });

      const result = await newsletterRepository.findByEmail('test@example.com');

      expect(result).toEqual(
        expect.objectContaining({
          email: 'test@example.com',
          _id: '5f8d04b3b54764421b7156c1',
        })
      );
    });

    it('should return null if subscriber not found', async () => {
      (NewsletterModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await newsletterRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list subscribers with pagination', async () => {
      const mockSubscribers = [
        {
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          email: 'sub1@example.com',
          isSubscribed: true,
        },
        {
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c2'),
          email: 'sub2@example.com',
          isSubscribed: true,
        },
      ];

      (NewsletterModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSubscribers),
      });

      (NewsletterModel.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await newsletterRepository.list(1, 50);

      expect(result.subscribers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by subscription status', async () => {
      const mockSubscribers = [
        {
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          email: 'active@example.com',
          isSubscribed: true,
        },
      ];

      (NewsletterModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSubscribers),
      });

      (NewsletterModel.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await newsletterRepository.list(1, 50, { isSubscribed: true });

      expect(NewsletterModel.find).toHaveBeenCalledWith({ isSubscribed: true });
      expect(result.subscribers).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return newsletter statistics', async () => {
      (NewsletterModel.countDocuments as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(20); // unsubscribed

      const result = await newsletterRepository.getStats();

      expect(result).toEqual({
        total: 100,
        active: 80,
        unsubscribed: 20,
      });
    });
  });
});

