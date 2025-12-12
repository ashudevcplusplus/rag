import { toStringId, toStringIds } from '../../../src/repositories/helpers';
import { Types } from 'mongoose';

describe('Repository Helpers', () => {
  describe('toStringId', () => {
    it('should convert _id ObjectId to string', () => {
      const objectId = new Types.ObjectId();
      const doc = {
        _id: objectId,
        name: 'Test',
      };

      const result = toStringId(doc);

      expect(typeof result._id).toBe('string');
      expect(result._id).toBe(objectId.toString());
      expect(result.name).toBe('Test');
    });

    it('should convert all ObjectId fields to strings', () => {
      const id = new Types.ObjectId();
      const projectId = new Types.ObjectId();
      const companyId = new Types.ObjectId();

      const doc = {
        _id: id,
        projectId: projectId,
        companyId: companyId,
        name: 'Test',
      };

      const result = toStringId(doc);

      expect(typeof result._id).toBe('string');
      expect(typeof result.projectId).toBe('string');
      expect(typeof result.companyId).toBe('string');
      expect(result._id).toBe(id.toString());
      expect(result.projectId).toBe(projectId.toString());
      expect(result.companyId).toBe(companyId.toString());
    });

    it('should preserve non-ObjectId fields', () => {
      const doc = {
        _id: new Types.ObjectId(),
        name: 'Test',
        count: 42,
        active: true,
        tags: ['a', 'b'],
        metadata: { key: 'value' },
      };

      const result = toStringId(doc);

      expect(result.name).toBe('Test');
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.tags).toEqual(['a', 'b']);
      expect(result.metadata).toEqual({ key: 'value' });
    });

    it('should handle null/falsy input', () => {
      const result = toStringId(null as any);
      expect(result).toBeNull();
    });

    it('should handle undefined _id', () => {
      const doc = {
        _id: new Types.ObjectId(),
        name: 'Test',
      };

      const docWithoutId = { ...doc };
      // Simulate case where _id is not an ObjectId
      (docWithoutId as any)._id = undefined;

      const result = toStringId(docWithoutId as any);

      expect(result._id).toBeUndefined();
    });

    it('should handle dates correctly', () => {
      const date = new Date('2024-01-01');
      const doc = {
        _id: new Types.ObjectId(),
        createdAt: date,
      };

      const result = toStringId(doc);

      expect(result.createdAt).toEqual(date);
    });

    it('should not modify nested ObjectIds', () => {
      const nestedId = new Types.ObjectId();
      const doc = {
        _id: new Types.ObjectId(),
        nested: {
          id: nestedId,
        },
      };

      const result = toStringId(doc);

      // Top-level _id should be converted
      expect(typeof result._id).toBe('string');
      // Nested ObjectId should remain as-is (not deeply converted)
      expect(result.nested.id).toEqual(nestedId);
    });
  });

  describe('toStringIds', () => {
    it('should convert array of documents', () => {
      const docs = [
        { _id: new Types.ObjectId(), name: 'Doc 1' },
        { _id: new Types.ObjectId(), name: 'Doc 2' },
        { _id: new Types.ObjectId(), name: 'Doc 3' },
      ];

      const results = toStringIds(docs);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(typeof result._id).toBe('string');
        expect(result.name).toBe(`Doc ${index + 1}`);
      });
    });

    it('should return empty array for empty input', () => {
      const result = toStringIds([]);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      const result = toStringIds(null as any);
      expect(result).toEqual([]);

      const result2 = toStringIds(undefined as any);
      expect(result2).toEqual([]);
    });

    it('should preserve order of documents', () => {
      const docs = [
        { _id: new Types.ObjectId(), order: 1 },
        { _id: new Types.ObjectId(), order: 2 },
        { _id: new Types.ObjectId(), order: 3 },
      ];

      const results = toStringIds(docs);

      expect(results[0].order).toBe(1);
      expect(results[1].order).toBe(2);
      expect(results[2].order).toBe(3);
    });

    it('should handle large arrays efficiently', () => {
      const docs = Array.from({ length: 1000 }, (_, i) => ({
        _id: new Types.ObjectId(),
        index: i,
      }));

      const startTime = Date.now();
      const results = toStringIds(docs);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(1000);
      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should convert all ObjectId fields in each document', () => {
      const docs = [
        {
          _id: new Types.ObjectId(),
          projectId: new Types.ObjectId(),
          userId: new Types.ObjectId(),
        },
      ];

      const results = toStringIds(docs);

      expect(typeof results[0]._id).toBe('string');
      expect(typeof results[0].projectId).toBe('string');
      expect(typeof results[0].userId).toBe('string');
    });
  });
});
