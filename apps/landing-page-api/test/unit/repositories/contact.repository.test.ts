import { contactRepository } from '../../../src/repositories/contact.repository';
import { ContactModel } from '../../../src/models/contact.model';
import { Types } from 'mongoose';
import { CreateContactDTO } from '../../../src/schemas/contact.schema';

// Mock Mongoose model
jest.mock('../../../src/models/contact.model');

describe('ContactRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a contact', async () => {
      const mockData: CreateContactDTO = {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        message: 'This is a test message',
      };

      const mockSavedContact = {
        ...mockData,
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          ...mockData,
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          status: 'new',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      (ContactModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedContact),
      }));

      const result = await contactRepository.create(mockData);

      expect(result).toEqual(
        expect.objectContaining({
          name: mockData.name,
          email: mockData.email,
          _id: '5f8d04b3b54764421b7156c1',
        })
      );
      expect(ContactModel).toHaveBeenCalledWith(mockData);
    });
  });

  describe('findById', () => {
    it('should find contact by id', async () => {
      const mockContact = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
        status: 'new',
      };

      (ContactModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockContact),
      });

      const result = await contactRepository.findById('5f8d04b3b54764421b7156c1');

      expect(result).toEqual(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          _id: '5f8d04b3b54764421b7156c1',
        })
      );
    });

    it('should return null if contact not found', async () => {
      (ContactModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await contactRepository.findById('5f8d04b3b54764421b7156c2');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update contact status', async () => {
      const mockUpdatedContact = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
        name: 'John Doe',
        email: 'john@example.com',
        status: 'read',
      };

      (ContactModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUpdatedContact),
      });

      const result = await contactRepository.update('5f8d04b3b54764421b7156c1', {
        status: 'read',
      });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'read',
          _id: '5f8d04b3b54764421b7156c1',
        })
      );
      expect(ContactModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '5f8d04b3b54764421b7156c1',
        { $set: { status: 'read' } },
        { new: true, runValidators: true }
      );
    });

    it('should return null if contact not found', async () => {
      (ContactModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await contactRepository.update('invalid-id', { status: 'read' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete contact', async () => {
      const mockDeletedContact = {
        _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
      };

      (ContactModel.findByIdAndDelete as jest.Mock).mockResolvedValue(mockDeletedContact);

      const result = await contactRepository.delete('5f8d04b3b54764421b7156c1');

      expect(result).toBe(true);
      expect(ContactModel.findByIdAndDelete).toHaveBeenCalledWith('5f8d04b3b54764421b7156c1');
    });

    it('should return false if contact not found', async () => {
      (ContactModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await contactRepository.delete('invalid-id');

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should list contacts with pagination', async () => {
      const mockContacts = [
        {
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          name: 'John Doe',
          email: 'john@example.com',
          status: 'new',
        },
        {
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c2'),
          name: 'Jane Doe',
          email: 'jane@example.com',
          status: 'read',
        },
      ];

      (ContactModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockContacts),
      });

      (ContactModel.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await contactRepository.list(1, 20);

      expect(result.contacts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      const mockContacts = [
        {
          _id: new Types.ObjectId('5f8d04b3b54764421b7156c1'),
          name: 'John Doe',
          status: 'new',
        },
      ];

      (ContactModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockContacts),
      });

      (ContactModel.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await contactRepository.list(1, 20, { status: 'new' });

      expect(ContactModel.find).toHaveBeenCalledWith({ status: 'new' });
      expect(result.contacts).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return contact statistics', async () => {
      (ContactModel.countDocuments as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // new
        .mockResolvedValueOnce(3) // read
        .mockResolvedValueOnce(2); // replied

      const result = await contactRepository.getStats();

      expect(result).toEqual({
        total: 10,
        new: 5,
        read: 3,
        replied: 2,
      });
    });
  });
});

