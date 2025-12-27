import {
  isTextMimeType,
  isSupportedMimeType,
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
} from '../src/extractor';

// Note: extractText, extractTextWithMetadata, and extractTextFromBuffer
// require file system access and are tested in integration tests

describe('Extractor Utilities', () => {
  describe('isTextMimeType', () => {
    test('returns true for text/* mime types', () => {
      expect(isTextMimeType('text/plain')).toBe(true);
      expect(isTextMimeType('text/html')).toBe(true);
      expect(isTextMimeType('text/css')).toBe(true);
      expect(isTextMimeType('text/javascript')).toBe(true);
      expect(isTextMimeType('text/markdown')).toBe(true);
      expect(isTextMimeType('text/csv')).toBe(true);
    });

    test('returns true for application/json', () => {
      expect(isTextMimeType('application/json')).toBe(true);
    });

    test('returns true for application/xml', () => {
      expect(isTextMimeType('application/xml')).toBe(true);
    });

    test('returns false for binary mime types', () => {
      expect(isTextMimeType('application/pdf')).toBe(false);
      expect(isTextMimeType('image/png')).toBe(false);
      expect(isTextMimeType('application/octet-stream')).toBe(false);
    });
  });

  describe('isSupportedMimeType', () => {
    test('returns true for text types', () => {
      expect(isSupportedMimeType('text/plain')).toBe(true);
      expect(isSupportedMimeType('application/json')).toBe(true);
    });

    test('returns true for PDF', () => {
      expect(isSupportedMimeType('application/pdf')).toBe(true);
    });

    test('returns false for unsupported types', () => {
      expect(isSupportedMimeType('image/png')).toBe(false);
      expect(isSupportedMimeType('application/zip')).toBe(false);
    });
  });

  describe('getExtensionFromMimeType', () => {
    test('returns correct extensions', () => {
      expect(getExtensionFromMimeType('text/plain')).toBe('.txt');
      expect(getExtensionFromMimeType('application/json')).toBe('.json');
      expect(getExtensionFromMimeType('application/pdf')).toBe('.pdf');
      expect(getExtensionFromMimeType('text/html')).toBe('.html');
      expect(getExtensionFromMimeType('text/markdown')).toBe('.md');
    });

    test('returns null for unknown mime types', () => {
      expect(getExtensionFromMimeType('application/unknown')).toBeNull();
      expect(getExtensionFromMimeType('image/png')).toBeNull();
    });
  });

  describe('getMimeTypeFromExtension', () => {
    test('returns correct mime types', () => {
      expect(getMimeTypeFromExtension('.txt')).toBe('text/plain');
      expect(getMimeTypeFromExtension('.json')).toBe('application/json');
      expect(getMimeTypeFromExtension('.pdf')).toBe('application/pdf');
      expect(getMimeTypeFromExtension('.html')).toBe('text/html');
      expect(getMimeTypeFromExtension('.md')).toBe('text/markdown');
    });

    test('handles extension without dot', () => {
      expect(getMimeTypeFromExtension('txt')).toBe('text/plain');
      expect(getMimeTypeFromExtension('json')).toBe('application/json');
    });

    test('is case insensitive', () => {
      expect(getMimeTypeFromExtension('.TXT')).toBe('text/plain');
      expect(getMimeTypeFromExtension('.JSON')).toBe('application/json');
    });

    test('returns null for unknown extensions', () => {
      expect(getMimeTypeFromExtension('.xyz')).toBeNull();
      expect(getMimeTypeFromExtension('.unknown')).toBeNull();
    });
  });
});
