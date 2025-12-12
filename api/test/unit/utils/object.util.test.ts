import {
  removeSensitiveFields,
  removePasswordHash,
  removePasswordHashFromArray,
} from '../../../src/utils/object.util';

describe('ObjectUtil', () => {
  describe('removeSensitiveFields', () => {
    it('should remove specified fields from object', () => {
      const obj = {
        id: '123',
        name: 'Test',
        password: 'secret',
        apiKey: 'key-123',
      };

      const result = removeSensitiveFields(obj, ['password', 'apiKey']);

      expect(result).toEqual({
        id: '123',
        name: 'Test',
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('apiKey');
    });

    it('should return object unchanged when no fields to remove', () => {
      const obj = {
        id: '123',
        name: 'Test',
      };

      const result = removeSensitiveFields(obj, []);

      expect(result).toEqual(obj);
    });

    it('should handle non-existent fields gracefully', () => {
      const obj = {
        id: '123',
        name: 'Test',
      };

      const result = removeSensitiveFields(obj, ['password', 'nonExistent']);

      expect(result).toEqual({
        id: '123',
        name: 'Test',
      });
    });

    it('should not modify the original object', () => {
      const obj = {
        id: '123',
        name: 'Test',
        password: 'secret',
      };
      const original = { ...obj };

      removeSensitiveFields(obj, ['password']);

      expect(obj).toEqual(original);
    });

    it('should handle empty object', () => {
      const obj = {} as Record<string, unknown>;

      const result = removeSensitiveFields(obj, ['password']);

      expect(result).toEqual({});
    });

    it('should handle object with nested values', () => {
      const obj = {
        id: '123',
        data: { nested: 'value' },
        secret: 'hidden',
      };

      const result = removeSensitiveFields(obj, ['secret']);

      expect(result).toEqual({
        id: '123',
        data: { nested: 'value' },
      });
    });
  });

  describe('removePasswordHash', () => {
    it('should remove passwordHash from user object', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashed-password-123',
      };

      const result = removePasswordHash(user);

      expect(result).toEqual({
        _id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should handle user without passwordHash', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        firstName: 'John',
        passwordHash: undefined,
      };

      const result = removePasswordHash(user);

      expect(result).toEqual({
        _id: '123',
        email: 'test@example.com',
        firstName: 'John',
      });
    });

    it('should preserve all other properties', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'admin',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        passwordHash: 'secret',
      };

      const result = removePasswordHash(user);

      expect(result._id).toBe('123');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.role).toBe('admin');
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toEqual(new Date('2024-01-01'));
    });

    it('should handle object with undefined passwordHash', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        passwordHash: undefined,
      };

      const result = removePasswordHash(user);

      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('removePasswordHashFromArray', () => {
    it('should remove passwordHash from all users in array', () => {
      const users = [
        {
          _id: '1',
          email: 'user1@example.com',
          passwordHash: 'hash1',
        },
        {
          _id: '2',
          email: 'user2@example.com',
          passwordHash: 'hash2',
        },
        {
          _id: '3',
          email: 'user3@example.com',
          passwordHash: 'hash3',
        },
      ];

      const result = removePasswordHashFromArray(users);

      expect(result).toHaveLength(3);
      result.forEach((user) => {
        expect(user).not.toHaveProperty('passwordHash');
      });
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].email).toBe('user2@example.com');
      expect(result[2].email).toBe('user3@example.com');
    });

    it('should handle empty array', () => {
      const users: Array<{ passwordHash?: string }> = [];

      const result = removePasswordHashFromArray(users);

      expect(result).toEqual([]);
    });

    it('should handle array with single user', () => {
      const users = [
        {
          _id: '1',
          email: 'user@example.com',
          passwordHash: 'hash',
        },
      ];

      const result = removePasswordHashFromArray(users);

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(result[0].email).toBe('user@example.com');
    });

    it('should handle array with mixed users (some with undefined passwordHash)', () => {
      const users = [
        {
          _id: '1',
          email: 'user1@example.com',
          passwordHash: 'hash1',
        },
        {
          _id: '2',
          email: 'user2@example.com',
          passwordHash: undefined,
        },
      ];

      const result = removePasswordHashFromArray(users);

      expect(result).toHaveLength(2);
      result.forEach((user) => {
        expect(user).not.toHaveProperty('passwordHash');
      });
    });

    it('should preserve all other properties for all users', () => {
      const users = [
        {
          _id: '1',
          email: 'user1@example.com',
          firstName: 'John',
          role: 'admin',
          passwordHash: 'hash1',
        },
        {
          _id: '2',
          email: 'user2@example.com',
          firstName: 'Jane',
          role: 'member',
          passwordHash: 'hash2',
        },
      ];

      const result = removePasswordHashFromArray(users);

      expect(result[0].firstName).toBe('John');
      expect(result[0].role).toBe('admin');
      expect(result[1].firstName).toBe('Jane');
      expect(result[1].role).toBe('member');
    });
  });
});
