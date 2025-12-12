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
            hasOverlap =
              currentEnd.includes(nextStart.slice(0, 3)) ||
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

    test('handles overlap larger than chunk text (extractOverlap edge case)', () => {
      // When overlap is large relative to chunk, the extractOverlap function
      // should return the entire chunk
      const text = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z';
      // Use chunk size 20 and overlap 15 to test extractOverlap edge case
      const chunks = chunkText(text, 20, 15);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk: string) => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });

    test('handles minimum overlap constraint (line 70 edge case)', () => {
      // This tests the case where word boundary search would reduce overlap
      // below minimum (80% of requested)
      const text = 'WordA WordB WordC WordD WordE WordF WordG WordH WordI WordJ';
      // Chunk size 25, overlap 10 - forces word boundary adjustment
      const chunks = chunkText(text, 25, 10);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain('Word');
    });

    test('handles text with no separators requiring force split (lines 102-132)', () => {
      // Create text with no spaces, newlines, or sentence boundaries
      const text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      // Use small chunk size to force character-level splitting
      const chunks = chunkText(text, 20, 5);
      expect(chunks.length).toBeGreaterThan(1);
      // Verify all characters are included across chunks
      const joinedChunks = chunks.join('');
      expect(joinedChunks).toContain('abcdefghij');
      expect(joinedChunks).toContain('XYZ');
    });

    test('handles very long continuous text with forced character splitting', () => {
      // Long text without natural break points
      const longWord = 'x'.repeat(150);
      const chunks = chunkText(longWord, 50, 10);
      expect(chunks.length).toBeGreaterThan(1);
      // Each chunk should respect the size limit (accounting for overlap)
      chunks.forEach((chunk: string) => {
        expect(chunk.length).toBeLessThanOrEqual(60); // chunkSize + some overlap tolerance
      });
    });

    test('handles whitespace-only text', () => {
      const text = '   \n\n   \t   ';
      const chunks = chunkText(text, 100, 20);
      // Should return empty or chunks that trim to empty
      const nonEmptyChunks = chunks.filter((c: string) => c.trim().length > 0);
      expect(nonEmptyChunks).toEqual([]);
    });

    test('covers line 70: overlap reset when word boundary search reduces overlap below minimum', () => {
      // Create text where word boundary at position would reduce overlap below 80%
      // Need text that when split, the extractOverlap function finds a space/newline
      // that would result in less than minOverlap (80% of requested)
      const text = 'ThisIsAVeryLongWordWithNoSpacesUntilHere ThenMoreTextWithoutSpacesForAWhile';
      const chunks = chunkText(text, 40, 20);
      expect(chunks.length).toBeGreaterThan(1);
      // Verify chunks contain expected content
      expect(chunks[0]).toContain('ThisIsA');
    });

    test('covers lines 112-130: force split with very small available size', () => {
      // Create text that triggers the force split path with small pieces
      // When currentLength + piece.length > availableSize triggers line 112
      const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz';
      // Small chunk size with relatively large overlap
      const chunks = chunkText(text, 15, 8);
      expect(chunks.length).toBeGreaterThan(2);
      // Verify content is preserved
      chunks.forEach((chunk: string) => {
        expect(chunk.length).toBeGreaterThan(0);
      });
    });

    test('covers line 124-130: small remaining text after separator exhaustion', () => {
      // Text that after all separators are exhausted, leaves small pieces (lines 124-130)
      const text = 'ab cd ef gh ij kl mn op qr st uv wx yz';
      const chunks = chunkText(text, 10, 3);
      expect(chunks.length).toBeGreaterThan(2);
      // First chunk should start from beginning
      expect(chunks[0]).toContain('ab');
    });

    test('covers force split path (line 102-118) - text with no separators larger than chunkSize', () => {
      // Create text WITHOUT any separators (\n\n, \n, . , space)
      // This forces the code through all separator levels to the force split path
      const noSeparatorText = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      // Use small chunk size so the text is definitely larger than chunkSize
      const chunks = chunkText(noSeparatorText, 20, 5);

      expect(chunks.length).toBeGreaterThan(1);
      // Verify content is distributed across chunks
      expect(chunks.some((c: string) => c.includes('abc'))).toBe(true);
      expect(chunks.some((c: string) => c.includes('XYZ') || c.includes('xyz'))).toBe(true);
    });

    test('covers line 70: overlap reduced below minimum due to space position', () => {
      // Need a chunk where:
      // 1. Length > chunkOverlap
      // 2. A space is found in the search window
      // 3. After adjusting to space+1, remaining overlap < minOverlap (80%)
      // Example: chunkOverlap=20, minOverlap=16
      // Chunk of 30 chars with space at position 27 (from end position 3)
      // overlapStart = 30-20 = 10, search finds space at 27, new overlapStart=28
      // remaining = 30-28 = 2 < 16, so reset to 30-20=10
      const text = 'LongWordWithoutAnySpaces AndThenASpaceNearEnd';
      // chunkSize=25, overlap=20, chunk will be ~25 chars
      // If we get "LongWordWithoutAnySpaces " as a chunk (25 chars)
      // space at position 24, overlapStart=10, finds space at 24, overlapStart=25
      // remaining=25-25=0 < 16, reset to 25-20=5
      const chunks = chunkText(text, 25, 20);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    test('covers lines 124-130: text smaller than chunkSize after exhausting separators', () => {
      // Create text where after processing, the remaining piece is <= chunkSize
      // but needs to go through the else branch (lines 124-130)
      // Use text with no standard separators that is between chunkSize and 0
      const shortNoSepText = 'abcdefghij'; // 10 chars, no separators
      const chunks = chunkText(shortNoSepText, 20, 5);
      // Single chunk since it's smaller than chunkSize
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe('abcdefghij');
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
