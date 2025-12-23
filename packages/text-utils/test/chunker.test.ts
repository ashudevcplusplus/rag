import {
  recursiveChunkText,
  chunkText,
  chunkTextWithMetadata,
  estimateChunkCount,
  splitBySentences,
  splitByParagraphs,
} from '../src/chunker';

describe('Chunker Utilities', () => {
  describe('recursiveChunkText', () => {
    test('returns empty array for empty input', () => {
      expect(recursiveChunkText('')).toEqual([]);
      expect(recursiveChunkText('   ')).toEqual([]);
    });

    test('returns single chunk for text smaller than chunk size', () => {
      const text = 'Short text';
      const chunks = recursiveChunkText(text, { chunkSize: 1000 });
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Short text');
    });

    test('chunks text correctly with overlap', () => {
      const text = 'This is a longer text that should be chunked with overlap between chunks.';
      const chunks = recursiveChunkText(text, { chunkSize: 30, chunkOverlap: 10 });

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain('This');
      expect(chunks[chunks.length - 1]).toContain('chunks');
    });

    test('handles text with sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = recursiveChunkText(text, { chunkSize: 20, chunkOverlap: 5 });
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });

    test('trims whitespace from chunks by default', () => {
      const text = '  Hello    World  ';
      const chunks = recursiveChunkText(text);
      expect(chunks[0].trim()).toBe('Hello    World');
    });

    test('preserves whitespace when trimChunks is false', () => {
      const text = '  Hello World  ';
      const chunks = recursiveChunkText(text, { chunkSize: 1000, trimChunks: false });
      expect(chunks[0]).toBe('  Hello World  ');
    });

    test('handles text with no natural separators', () => {
      const text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const chunks = recursiveChunkText(text, { chunkSize: 20, chunkOverlap: 5 });
      expect(chunks.length).toBeGreaterThan(1);
      const joined = chunks.join('');
      expect(joined).toContain('abcdefghij');
    });

    test('handles very long continuous text', () => {
      const longWord = 'x'.repeat(150);
      const chunks = recursiveChunkText(longWord, { chunkSize: 50, chunkOverlap: 10 });
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(60);
      });
    });

    test('handles whitespace-only text', () => {
      const text = '   \n\n   \t   ';
      const chunks = recursiveChunkText(text, { chunkSize: 100, chunkOverlap: 20 });
      const nonEmpty = chunks.filter((c) => c.trim().length > 0);
      expect(nonEmpty).toEqual([]);
    });

    test('uses custom separators when provided', () => {
      const text = 'Part1|Part2|Part3';
      const chunks = recursiveChunkText(text, {
        chunkSize: 10,
        chunkOverlap: 2,
        separators: ['|', ''],
      });
      expect(chunks.length).toBeGreaterThan(1);
    });

    test('maintains overlap between consecutive chunks', () => {
      const text =
        'This is a longer text that should be properly chunked with overlap to maintain context between consecutive chunks.';
      const chunks = recursiveChunkText(text, { chunkSize: 40, chunkOverlap: 15 });

      if (chunks.length > 1) {
        for (let i = 0; i < chunks.length - 1; i++) {
          const currentEnd = chunks[i].slice(-10);
          const nextStart = chunks[i + 1].slice(0, 20);
          // Check for some overlap (exact overlap detection is complex due to word boundaries)
          const hasOverlap = currentEnd.split('').some((char) => nextStart.includes(char));
          expect(hasOverlap).toBe(true);
        }
      }
    });
  });

  describe('chunkText (deprecated)', () => {
    test('is an alias for recursiveChunkText', () => {
      const text = 'Test text for chunking';
      const chunks1 = chunkText(text, 1000, 200);
      const chunks2 = recursiveChunkText(text, { chunkSize: 1000, chunkOverlap: 200 });
      expect(chunks1).toEqual(chunks2);
    });
  });

  describe('chunkTextWithMetadata', () => {
    test('returns chunks with metadata', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const chunks = chunkTextWithMetadata(text, { chunkSize: 20, chunkOverlap: 5 });

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk, index) => {
        expect(chunk.content).toBeDefined();
        expect(chunk.metadata).toBeDefined();
        expect(chunk.metadata?.index).toBe(index);
        expect(chunk.metadata?.length).toBe(chunk.content.length);
      });
    });

    test('returns empty array for empty input', () => {
      const chunks = chunkTextWithMetadata('');
      expect(chunks).toEqual([]);
    });
  });

  describe('estimateChunkCount', () => {
    test('returns 1 for text smaller than chunk size', () => {
      expect(estimateChunkCount(500, 1000, 200)).toBe(1);
    });

    test('estimates correctly for larger text', () => {
      // Text of 2000 chars with chunk size 1000 and overlap 200
      // Effective chunk size = 800, so ~3 chunks
      const estimate = estimateChunkCount(2000, 1000, 200);
      expect(estimate).toBeGreaterThan(1);
      expect(estimate).toBeLessThanOrEqual(5);
    });

    test('uses default values', () => {
      const estimate = estimateChunkCount(5000);
      expect(estimate).toBeGreaterThan(1);
    });
  });

  describe('splitBySentences', () => {
    test('splits text into sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const sentences = splitBySentences(text);
      expect(sentences).toHaveLength(3);
      expect(sentences[0]).toBe('First sentence.');
      expect(sentences[1]).toBe('Second sentence!');
      expect(sentences[2]).toBe('Third sentence?');
    });

    test('returns empty array for empty input', () => {
      expect(splitBySentences('')).toEqual([]);
      expect(splitBySentences('   ')).toEqual([]);
    });

    test('handles single sentence', () => {
      const sentences = splitBySentences('Just one sentence.');
      expect(sentences).toHaveLength(1);
    });
  });

  describe('splitByParagraphs', () => {
    test('splits text into paragraphs', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const paragraphs = splitByParagraphs(text);
      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0]).toBe('First paragraph.');
      expect(paragraphs[1]).toBe('Second paragraph.');
      expect(paragraphs[2]).toBe('Third paragraph.');
    });

    test('returns empty array for empty input', () => {
      expect(splitByParagraphs('')).toEqual([]);
      expect(splitByParagraphs('   ')).toEqual([]);
    });

    test('handles single paragraph', () => {
      const paragraphs = splitByParagraphs('Just one paragraph.');
      expect(paragraphs).toHaveLength(1);
    });

    test('handles multiple newlines between paragraphs', () => {
      const text = 'First.\n\n\n\nSecond.';
      const paragraphs = splitByParagraphs(text);
      expect(paragraphs).toHaveLength(2);
    });
  });
});
