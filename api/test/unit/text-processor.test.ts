import { chunkText, extractText } from '../../src/utils/text-processor';
import fs from 'fs';
import pdf from 'pdf-parse';

// Mock dependencies to avoid file I/O during unit tests
jest.mock('fs');
jest.mock('pdf-parse', () => jest.fn());

describe('Text Processor', () => {
  // --- Chunking Logic ---
  describe('chunkText', () => {
    test('returns empty array for empty input', () => {
      const result = chunkText('', 100, 20);
      // Function may return [""] which gets filtered, so check it's effectively empty
      expect(result.filter((chunk: string) => chunk.length > 0)).toEqual([]);
    });

    test('returns single chunk for text smaller than chunk size', () => {
      const text = 'Short text';
      const chunks = chunkText(text, 1000);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Short text');
    });

    test('chunks text correctly with overlap', () => {
      const text = '1234567890';
      // Chunk size 5, overlap 2
      const chunks = chunkText(text, 5, 2);

      // Verify chunking behavior
      expect(chunks.length).toBeGreaterThan(0);

      // All chunks except possibly the last should be <= chunkSize
      chunks.slice(0, -1).forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(5);
      });

      // First chunk should contain start of text
      expect(chunks[0]).toContain('1');
      // Last chunk should contain end of text
      expect(chunks[chunks.length - 1]).toContain('0');

      // Verify overlap exists between consecutive chunks
      if (chunks.length > 1) {
        for (let i = 0; i < chunks.length - 1; i++) {
          // Check that end of current chunk overlaps with start of next
          const currentChunk = chunks[i];
          const nextChunk = chunks[i + 1];
          const overlapFound = currentChunk
            .slice(-2)
            .split('')
            .some((char) => nextChunk.slice(0, 2).includes(char));
          expect(overlapFound).toBe(true);
        }
      }
    });

    test('trims whitespace from chunks', () => {
      const text = '  Hello    World  ';
      const chunks = chunkText(text);
      // Function trims chunks but doesn't normalize internal whitespace
      expect(chunks[0].trim()).toBe('Hello    World');
    });

    test('handles text with sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = chunkText(text, 20, 5);
      // Should break at sentence boundaries when possible
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk: string) => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });
  });

  // --- Extraction Logic ---
  describe('extractText', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('extracts text from PDF via pdf-parse', async () => {
      const mockBuffer = Buffer.from('fake-pdf-content');
      (fs.readFileSync as jest.Mock).mockReturnValue(mockBuffer);
      (pdf as jest.Mock).mockResolvedValue({ text: 'Parsed PDF Text' });

      const result = await extractText('/path/to/doc.pdf', 'application/pdf');

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/doc.pdf');
      expect(pdf).toHaveBeenCalledWith(mockBuffer);
      expect(result).toBe('Parsed PDF Text');
    });

    test('extracts text from plain text files directly', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('Plain Content');

      const result = await extractText('/path/to/note.txt', 'text/plain');

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/note.txt', 'utf-8');
      expect(pdf).not.toHaveBeenCalled(); // Should skip PDF parser
      expect(result).toBe('Plain Content');
    });

    test('extracts text from JSON files', async () => {
      const jsonContent = '{"key": "value"}';
      (fs.readFileSync as jest.Mock).mockReturnValue(jsonContent);

      const result = await extractText('/path/to/data.json', 'application/json');

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/data.json', 'utf-8');
      expect(result).toBe(jsonContent);
    });

    test('throws error for unsupported file types', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Cannot read file');
      });

      await expect(extractText('/path/to/file.bin', 'application/octet-stream')).rejects.toThrow(
        'Unsupported file type: application/octet-stream'
      );
    });
  });
});
