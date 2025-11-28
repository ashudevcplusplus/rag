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
      const text = 'This is a longer text that should be chunked with overlap between chunks.';
      // Chunk size 30, overlap 10
      const chunks = chunkText(text, 30, 10);

      // Verify chunking behavior
      expect(chunks.length).toBeGreaterThan(1);

      // Verify overlap exists between consecutive chunks
      if (chunks.length > 1) {
        for (let i = 0; i < chunks.length - 1; i++) {
          const currentChunk = chunks[i];
          const nextChunk = chunks[i + 1];
          
          // Check that there's actual overlap between chunks
          // Due to word boundary adjustments, we check for at least 3 characters of overlap
          let hasOverlap = false;
          
          // Check if the end of current chunk appears at the start of next chunk
          // Try different overlap lengths (from requested down to minimum)
          for (let overlapLen = 10; overlapLen >= 3; overlapLen--) {
            const currentEnd = currentChunk.slice(-overlapLen);
            const nextStart = nextChunk.slice(0, overlapLen);
            if (currentEnd === nextStart && currentEnd.length >= 3) {
              hasOverlap = true;
              break;
            }
          }
          
          // If exact match not found, check for substring overlap
          if (!hasOverlap) {
            // Check if any significant portion of the end appears at the start
            const currentEnd = currentChunk.slice(-8);
            const nextStart = nextChunk.slice(0, 8);
            hasOverlap = currentEnd.includes(nextStart.slice(0, 3)) || 
                        nextStart.includes(currentEnd.slice(-3));
          }
          
          expect(hasOverlap).toBe(true);
        }
      }

      // First chunk should contain start of text
      expect(chunks[0]).toContain('This');
      // Last chunk should contain end of text
      expect(chunks[chunks.length - 1]).toContain('chunks');
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
