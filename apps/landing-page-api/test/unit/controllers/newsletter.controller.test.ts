import { Request, Response } from 'express';
import {
  subscribe,
  unsubscribe,
  listSubscribers,
  getNewsletterStats,
} from '../../../src/controllers/newsletter.controller';
import { newsletterRepository } from '../../../src/repositories/newsletter.repository';
import { subscribeNewsletterSchema } from '../../../src/schemas/newsletter.schema';
import { z } from 'zod';

// Mock dependencies
jest.mock('../../../src/repositories/newsletter.repository');
jest.mock('../../../src/schemas/newsletter.schema');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('NewsletterController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('subscribe', () => {
    it('should subscribe new user successfully', async () => {
      const newsletterData = {
        email: 'new@example.com',
      };

      const mockSubscriber = {
        _id: 'subscriber-id-123',
        email: 'new@example.com',
        isSubscribed: true,
        subscribedAt: new Date(),
      };

      mockRequest.body = newsletterData;
      (subscribeNewsletterSchema.parse as jest.Mock).mockReturnValue(newsletterData);
      (newsletterRepository.subscribe as jest.Mock).mockResolvedValue({
        subscriber: mockSubscriber,
        isNew: true,
      });

      await subscribe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(subscribeNewsletterSchema.parse).toHaveBeenCalledWith(newsletterData);
      expect(newsletterRepository.subscribe).toHaveBeenCalledWith(newsletterData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Successfully subscribed to our newsletter!',
        email: 'new@example.com',
      });
    });

    it('should handle existing subscriber', async () => {
      const newsletterData = {
        email: 'existing@example.com',
      };

      const mockSubscriber = {
        _id: 'subscriber-id-123',
        email: 'existing@example.com',
        isSubscribed: true,
      };

      mockRequest.body = newsletterData;
      (subscribeNewsletterSchema.parse as jest.Mock).mockReturnValue(newsletterData);
      (newsletterRepository.subscribe as jest.Mock).mockResolvedValue({
        subscriber: mockSubscriber,
        isNew: false,
      });

      await subscribe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'You are already subscribed to our newsletter.',
        email: 'existing@example.com',
      });
    });

    it('should handle validation errors', async () => {
      const validationError = new z.ZodError([
        {
          code: 'invalid_string',
          validation: 'email',
          path: ['email'],
          message: 'Invalid email address',
        },
      ]);

      mockRequest.body = { email: 'invalid-email' };
      (subscribeNewsletterSchema.parse as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await subscribe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(validationError);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe successfully', async () => {
      const newsletterData = {
        email: 'test@example.com',
      };

      mockRequest.body = newsletterData;
      (subscribeNewsletterSchema.parse as jest.Mock).mockReturnValue(newsletterData);
      (newsletterRepository.unsubscribe as jest.Mock).mockResolvedValue(true);

      await unsubscribe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(subscribeNewsletterSchema.parse).toHaveBeenCalledWith(newsletterData);
      expect(newsletterRepository.unsubscribe).toHaveBeenCalledWith('test@example.com');
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'You have been unsubscribed from our newsletter.',
      });
    });

    it('should return 404 if email not found', async () => {
      const newsletterData = {
        email: 'nonexistent@example.com',
      };

      mockRequest.body = newsletterData;
      (subscribeNewsletterSchema.parse as jest.Mock).mockReturnValue(newsletterData);
      (newsletterRepository.unsubscribe as jest.Mock).mockResolvedValue(false);

      await unsubscribe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Email not found in our newsletter list.',
      });
    });
  });

  describe('listSubscribers', () => {
    it('should list subscribers with default pagination', async () => {
      const mockResult = {
        subscribers: [
          {
            _id: 'subscriber-1',
            email: 'sub1@example.com',
            isSubscribed: true,
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockRequest.query = {};
      (newsletterRepository.list as jest.Mock).mockResolvedValue(mockResult);

      await listSubscribers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(newsletterRepository.list).toHaveBeenCalledWith(1, 50, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should list subscribers with filters', async () => {
      const mockResult = {
        subscribers: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      mockRequest.query = { page: '1', limit: '20', active: 'true' };
      (newsletterRepository.list as jest.Mock).mockResolvedValue(mockResult);

      await listSubscribers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(newsletterRepository.list).toHaveBeenCalledWith(1, 20, { isSubscribed: true });
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getNewsletterStats', () => {
    it('should return newsletter statistics', async () => {
      const mockStats = {
        total: 1000,
        active: 800,
        unsubscribed: 200,
      };

      (newsletterRepository.getStats as jest.Mock).mockResolvedValue(mockStats);

      await getNewsletterStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(newsletterRepository.getStats).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockStats);
    });
  });
});

