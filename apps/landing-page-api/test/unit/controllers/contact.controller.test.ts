import { Request, Response } from 'express';
import {
  submitContact,
  listContacts,
  getContactStats,
  updateContactStatus,
} from '../../../src/controllers/contact.controller';
import { contactRepository } from '../../../src/repositories/contact.repository';
import { createContactSchema, updateContactSchema } from '../../../src/schemas/contact.schema';
import { z } from 'zod';

// Mock dependencies
jest.mock('../../../src/repositories/contact.repository');
jest.mock('../../../src/schemas/contact.schema');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ContactController', () => {
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

  describe('submitContact', () => {
    it('should submit contact form successfully', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a test message',
      };

      const mockContact = {
        _id: 'contact-id-123',
        ...contactData,
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = contactData;
      (createContactSchema.parse as jest.Mock).mockReturnValue(contactData);
      (contactRepository.create as jest.Mock).mockResolvedValue(mockContact);

      await submitContact(mockRequest as Request, mockResponse as Response, mockNext);

      expect(createContactSchema.parse).toHaveBeenCalledWith(contactData);
      expect(contactRepository.create).toHaveBeenCalledWith(contactData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Thank you for your message! We will get back to you shortly.',
        id: 'contact-id-123',
      });
    });

    it('should handle validation errors', async () => {
      const validationError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['name'],
          message: 'Name is required',
        },
      ]);

      mockRequest.body = { email: 'test@example.com' };
      (createContactSchema.parse as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await submitContact(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(validationError);
    });
  });

  describe('listContacts', () => {
    it('should list contacts with default pagination', async () => {
      const mockResult = {
        contacts: [
          {
            _id: 'contact-1',
            name: 'John Doe',
            email: 'john@example.com',
            status: 'new',
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockRequest.query = {};
      (contactRepository.list as jest.Mock).mockResolvedValue(mockResult);

      await listContacts(mockRequest as Request, mockResponse as Response, mockNext);

      expect(contactRepository.list).toHaveBeenCalledWith(1, 20, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should list contacts with custom pagination and filters', async () => {
      const mockResult = {
        contacts: [],
        total: 0,
        page: 2,
        totalPages: 0,
      };

      mockRequest.query = { page: '2', limit: '10', status: 'read' };
      (contactRepository.list as jest.Mock).mockResolvedValue(mockResult);

      await listContacts(mockRequest as Request, mockResponse as Response, mockNext);

      expect(contactRepository.list).toHaveBeenCalledWith(2, 10, { status: 'read' });
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getContactStats', () => {
    it('should return contact statistics', async () => {
      const mockStats = {
        total: 100,
        new: 50,
        read: 30,
        replied: 20,
      };

      (contactRepository.getStats as jest.Mock).mockResolvedValue(mockStats);

      await getContactStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(contactRepository.getStats).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockStats);
    });
  });

  describe('updateContactStatus', () => {
    it('should update contact status successfully', async () => {
      const mockContact = {
        _id: 'contact-id-123',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'read',
      };

      mockRequest.params = { id: 'contact-id-123' };
      mockRequest.body = { status: 'read' };
      (updateContactSchema.parse as jest.Mock).mockReturnValue({ status: 'read' });
      (contactRepository.update as jest.Mock).mockResolvedValue(mockContact);

      await updateContactStatus(mockRequest as Request, mockResponse as Response, mockNext);

      expect(updateContactSchema.parse).toHaveBeenCalledWith({ status: 'read' });
      expect(contactRepository.update).toHaveBeenCalledWith('contact-id-123', {
        status: 'read',
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockContact);
    });

    it('should return 404 if contact not found', async () => {
      mockRequest.params = { id: 'non-existent-id' };
      mockRequest.body = { status: 'read' };
      (updateContactSchema.parse as jest.Mock).mockReturnValue({ status: 'read' });
      (contactRepository.update as jest.Mock).mockResolvedValue(null);

      await updateContactStatus(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Contact not found' });
    });

    it('should handle validation errors', async () => {
      const validationError = new z.ZodError([
        {
          code: 'invalid_enum_value',
          options: ['new', 'read', 'replied'],
          received: 'invalid',
          path: ['status'],
          message: 'Invalid status',
        },
      ]);

      mockRequest.params = { id: 'contact-id-123' };
      mockRequest.body = { status: 'invalid' };
      (updateContactSchema.parse as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await updateContactStatus(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(validationError);
    });
  });
});

