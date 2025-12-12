import {
  generateHash,
  generateFileHash,
  generateContentHash,
  generatePointId,
} from '../../../src/utils/hash.util';

describe('Hash Utilities', () => {
  describe('generateHash', () => {
    it('should generate SHA-256 hash by default for string input', () => {
      const hash = generateHash('test content');

      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate SHA-256 hash for Buffer input', () => {
      const buffer = Buffer.from('test content');
      const hash = generateHash(buffer);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate MD5 hash when specified', () => {
      const hash = generateHash('test content', 'md5');

      expect(hash).toHaveLength(32); // MD5 produces 32 hex characters
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent hashes for same input', () => {
      const input = 'consistent content';

      const hash1 = generateHash(input);
      const hash2 = generateHash(input);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = generateHash('content 1');
      const hash2 = generateHash('content 2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = generateHash('');

      expect(hash).toHaveLength(64);
      // SHA-256 of empty string is a known value
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle empty buffer', () => {
      const hash = generateHash(Buffer.from(''));

      expect(hash).toHaveLength(64);
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle UTF-8 content', () => {
      const hash = generateHash('你好世界 🌍');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle large content', () => {
      const largeContent = 'x'.repeat(1000000); // 1MB of data
      const hash = generateHash(largeContent);

      expect(hash).toHaveLength(64);
    });

    it('should produce same hash for string and equivalent buffer', () => {
      const content = 'test content';
      const buffer = Buffer.from(content, 'utf8');

      const hashFromString = generateHash(content);
      const hashFromBuffer = generateHash(buffer);

      expect(hashFromString).toBe(hashFromBuffer);
    });
  });

  describe('generateFileHash', () => {
    it('should generate SHA-256 hash for file buffer', () => {
      const fileBuffer = Buffer.from('file content here');
      const hash = generateFileHash(fileBuffer);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should be deterministic for same file content', () => {
      const content = 'same file content';
      const buffer1 = Buffer.from(content);
      const buffer2 = Buffer.from(content);

      const hash1 = generateFileHash(buffer1);
      const hash2 = generateFileHash(buffer2);

      expect(hash1).toBe(hash2);
    });

    it('should differ for different file contents', () => {
      const buffer1 = Buffer.from('file 1');
      const buffer2 = Buffer.from('file 2');

      const hash1 = generateFileHash(buffer1);
      const hash2 = generateFileHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle binary content', () => {
      const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
      const hash = generateFileHash(binaryBuffer);

      expect(hash).toHaveLength(64);
    });
  });

  describe('generateContentHash', () => {
    it('should generate SHA-256 hash for content string', () => {
      const hash = generateContentHash('some text content');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should be deterministic for same content', () => {
      const content = 'same content';

      const hash1 = generateContentHash(content);
      const hash2 = generateContentHash(content);

      expect(hash1).toBe(hash2);
    });

    it('should differ for different content', () => {
      const hash1 = generateContentHash('content A');
      const hash2 = generateContentHash('content B');

      expect(hash1).not.toBe(hash2);
    });

    it('should be case sensitive', () => {
      const hash1 = generateContentHash('Hello');
      const hash2 = generateContentHash('hello');

      expect(hash1).not.toBe(hash2);
    });

    it('should be whitespace sensitive', () => {
      const hash1 = generateContentHash('hello world');
      const hash2 = generateContentHash('hello  world');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generatePointId', () => {
    it('should generate MD5 hash for point ID components', () => {
      const pointId = generatePointId('company-1', 'file-1', 'content-hash', 0);

      expect(pointId).toHaveLength(32); // MD5 produces 32 hex characters
      expect(pointId).toMatch(/^[a-f0-9]+$/);
    });

    it('should be deterministic for same components', () => {
      const pointId1 = generatePointId('company-1', 'file-1', 'hash-1', 0);
      const pointId2 = generatePointId('company-1', 'file-1', 'hash-1', 0);

      expect(pointId1).toBe(pointId2);
    });

    it('should differ for different company IDs', () => {
      const pointId1 = generatePointId('company-1', 'file-1', 'hash-1', 0);
      const pointId2 = generatePointId('company-2', 'file-1', 'hash-1', 0);

      expect(pointId1).not.toBe(pointId2);
    });

    it('should differ for different file IDs', () => {
      const pointId1 = generatePointId('company-1', 'file-1', 'hash-1', 0);
      const pointId2 = generatePointId('company-1', 'file-2', 'hash-1', 0);

      expect(pointId1).not.toBe(pointId2);
    });

    it('should differ for different content hashes', () => {
      const pointId1 = generatePointId('company-1', 'file-1', 'hash-1', 0);
      const pointId2 = generatePointId('company-1', 'file-1', 'hash-2', 0);

      expect(pointId1).not.toBe(pointId2);
    });

    it('should differ for different indices', () => {
      const pointId1 = generatePointId('company-1', 'file-1', 'hash-1', 0);
      const pointId2 = generatePointId('company-1', 'file-1', 'hash-1', 1);

      expect(pointId1).not.toBe(pointId2);
    });

    it('should handle ObjectId-like strings', () => {
      const companyId = '507f1f77bcf86cd799439011';
      const fileId = '507f1f77bcf86cd799439012';

      const pointId = generatePointId(companyId, fileId, 'hash', 0);

      expect(pointId).toHaveLength(32);
    });

    it('should handle large index values', () => {
      const pointId = generatePointId('company', 'file', 'hash', 999999);

      expect(pointId).toHaveLength(32);
    });

    it('should format components correctly', () => {
      // The internal format is "companyId:fileId:contentHash:index"
      // This is tested implicitly through determinism
      const pointId1 = generatePointId('a', 'b', 'c', 0);
      const pointId2 = generatePointId('a:b', 'c', '0', 0);

      // These should NOT be equal since the separator is :
      // Actually they might collide - this tests that we handle edge cases
      expect(pointId1).not.toBe(pointId2);
    });
  });
});
