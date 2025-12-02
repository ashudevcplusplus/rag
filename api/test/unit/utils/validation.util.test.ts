import {
  validateFilePath,
  validateWebhookUrl,
  validateWebhookPayloadSize,
  sanitizeFilePath,
  validateCompanyId,
  validateProjectId,
  validateNumberInRange,
} from '../../../src/utils/validation.util';

describe('Validation Utilities', () => {
  describe('validateFilePath', () => {
    it('should accept valid file paths', () => {
      expect(validateFilePath('/var/uploads/file.txt')).toBe(true);
      expect(validateFilePath('data/uploads/file.txt')).toBe(true);
      expect(validateFilePath('./uploads/file.txt')).toBe(true);
    });

    it('should reject null bytes', () => {
      expect(validateFilePath('/path/to\0/file.txt')).toBe(false);
    });

    it('should reject path traversal attempts', () => {
      expect(validateFilePath('../../../etc/passwd')).toBe(false);
      expect(validateFilePath('/path/../../../etc/passwd')).toBe(false);
    });

    it('should reject system paths', () => {
      expect(validateFilePath('/etc/passwd')).toBe(false);
      expect(validateFilePath('/root/.ssh/id_rsa')).toBe(false);
    });

    it('should reject invalid inputs', () => {
      expect(validateFilePath('')).toBe(false);
      expect(validateFilePath(null as unknown as string)).toBe(false);
      expect(validateFilePath(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateWebhookUrl', () => {
    it('should accept valid HTTP/HTTPS URLs', () => {
      expect(validateWebhookUrl('https://example.com/webhook')).toBe(true);
      expect(validateWebhookUrl('http://example.com/webhook')).toBe(true);
    });

    it('should reject non-HTTP protocols', () => {
      expect(validateWebhookUrl('ftp://example.com')).toBe(false);
      expect(validateWebhookUrl('file:///etc/passwd')).toBe(false);
      expect(validateWebhookUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject internal URLs in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      expect(validateWebhookUrl('http://localhost/webhook')).toBe(false);
      expect(validateWebhookUrl('http://127.0.0.1/webhook')).toBe(false);
      expect(validateWebhookUrl('http://10.0.0.1/webhook')).toBe(false);
      expect(validateWebhookUrl('http://192.168.1.1/webhook')).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should accept internal URLs in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      expect(validateWebhookUrl('http://localhost:3000/webhook')).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should reject invalid URLs', () => {
      expect(validateWebhookUrl('')).toBe(false);
      expect(validateWebhookUrl('not-a-url')).toBe(false);
      expect(validateWebhookUrl(null as unknown as string)).toBe(false);
    });
  });

  describe('validateWebhookPayloadSize', () => {
    it('should accept payloads within size limit', () => {
      const smallPayload = { message: 'test' };
      expect(validateWebhookPayloadSize(smallPayload, 1024 * 1024)).toBe(true);
    });

    it('should reject payloads exceeding size limit', () => {
      const largePayload = { data: 'x'.repeat(2 * 1024 * 1024) };
      expect(validateWebhookPayloadSize(largePayload, 1024 * 1024)).toBe(false);
    });

    it('should use default 1MB limit', () => {
      const payload = { data: 'x'.repeat(2 * 1024 * 1024) };
      expect(validateWebhookPayloadSize(payload)).toBe(false);
    });

    it('should handle circular references gracefully', () => {
      const circular: { self?: unknown } = {};
      circular.self = circular;
      expect(validateWebhookPayloadSize(circular)).toBe(false);
    });
  });

  describe('sanitizeFilePath', () => {
    it('should remove null bytes', () => {
      expect(sanitizeFilePath('/path/to\0/file.txt')).toBe('/path/to/file.txt');
    });

    it('should normalize paths', () => {
      expect(sanitizeFilePath('/path/./to/./file.txt')).toBe('/path/to/file.txt');
    });

    it('should remove path traversal attempts', () => {
      expect(sanitizeFilePath('/path/../to/file.txt')).not.toContain('..');
    });

    it('should handle invalid inputs', () => {
      expect(sanitizeFilePath('')).toBe('');
      expect(sanitizeFilePath(null as unknown as string)).toBe('');
      expect(sanitizeFilePath(undefined as unknown as string)).toBe('');
    });
  });

  describe('validateCompanyId', () => {
    it('should accept valid MongoDB ObjectId', () => {
      expect(validateCompanyId('507f1f77bcf86cd799439011')).toBe(true);
      expect(validateCompanyId('507f191e810c19729de860ea')).toBe(true);
    });

    it('should reject invalid ObjectIds', () => {
      expect(validateCompanyId('invalid')).toBe(false);
      expect(validateCompanyId('123')).toBe(false);
      expect(validateCompanyId('507f1f77bcf86cd79943901g')).toBe(false); // 'g' not hex
    });

    it('should reject invalid inputs', () => {
      expect(validateCompanyId('')).toBe(false);
      expect(validateCompanyId(null as unknown as string)).toBe(false);
    });
  });

  describe('validateProjectId', () => {
    it('should accept valid MongoDB ObjectId', () => {
      expect(validateProjectId('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should reject invalid ObjectIds', () => {
      expect(validateProjectId('invalid')).toBe(false);
      expect(validateProjectId('')).toBe(false);
    });
  });

  describe('validateNumberInRange', () => {
    it('should accept numbers within range', () => {
      expect(validateNumberInRange(5, 0, 10)).toBe(true);
      expect(validateNumberInRange(0, 0, 10)).toBe(true);
      expect(validateNumberInRange(10, 0, 10)).toBe(true);
    });

    it('should reject numbers outside range', () => {
      expect(validateNumberInRange(-1, 0, 10)).toBe(false);
      expect(validateNumberInRange(11, 0, 10)).toBe(false);
    });

    it('should reject invalid numbers', () => {
      expect(validateNumberInRange(NaN, 0, 10)).toBe(false);
      expect(validateNumberInRange('5' as unknown as number, 0, 10)).toBe(false);
    });
  });
});
