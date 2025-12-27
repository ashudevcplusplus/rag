import {
  normalizeWhitespace,
  collapseWhitespace,
  countWords,
  countSentences,
  countParagraphs,
  estimateReadingTime,
  truncateText,
  truncateAtWord,
  removeStopWords,
  extractKeywords,
  getTextPreview,
  isMostlyAscii,
  generateContentHash,
} from '../src/normalizer';

describe('Normalizer Utilities', () => {
  describe('normalizeWhitespace', () => {
    test('normalizes line endings', () => {
      expect(normalizeWhitespace('line1\r\nline2')).toBe('line1\nline2');
      expect(normalizeWhitespace('line1\rline2')).toBe('line1\nline2');
    });

    test('collapses multiple spaces', () => {
      expect(normalizeWhitespace('hello    world')).toBe('hello world');
    });

    test('collapses multiple newlines to double newline', () => {
      expect(normalizeWhitespace('para1\n\n\n\npara2')).toBe('para1\n\npara2');
    });

    test('trims each line', () => {
      expect(normalizeWhitespace('  hello  \n  world  ')).toBe('hello\nworld');
    });

    test('handles empty input', () => {
      expect(normalizeWhitespace('')).toBe('');
    });
  });

  describe('collapseWhitespace', () => {
    test('collapses all whitespace to single spaces', () => {
      expect(collapseWhitespace('hello   \n\n  world')).toBe('hello world');
    });

    test('trims result', () => {
      expect(collapseWhitespace('  hello  ')).toBe('hello');
    });

    test('handles empty input', () => {
      expect(collapseWhitespace('')).toBe('');
    });
  });

  describe('countWords', () => {
    test('counts words correctly', () => {
      expect(countWords('hello world')).toBe(2);
      expect(countWords('one two three four')).toBe(4);
    });

    test('handles multiple spaces', () => {
      expect(countWords('hello    world')).toBe(2);
    });

    test('returns 0 for empty input', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });
  });

  describe('countSentences', () => {
    test('counts sentences correctly', () => {
      expect(countSentences('Hello. World!')).toBe(2);
      expect(countSentences('First? Second. Third!')).toBe(3);
    });

    test('returns 0 for empty input', () => {
      expect(countSentences('')).toBe(0);
    });

    test('handles text without sentence endings', () => {
      expect(countSentences('no ending')).toBe(0);
    });
  });

  describe('countParagraphs', () => {
    test('counts paragraphs correctly', () => {
      expect(countParagraphs('Para 1\n\nPara 2\n\nPara 3')).toBe(3);
    });

    test('returns 0 for empty input', () => {
      expect(countParagraphs('')).toBe(0);
    });

    test('handles single paragraph', () => {
      expect(countParagraphs('Just one')).toBe(1);
    });
  });

  describe('estimateReadingTime', () => {
    test('estimates reading time correctly', () => {
      const text = Array(200).fill('word').join(' '); // 200 words
      expect(estimateReadingTime(text)).toBe(1); // 1 minute at 200 WPM
    });

    test('uses custom WPM', () => {
      const text = Array(400).fill('word').join(' '); // 400 words
      expect(estimateReadingTime(text, 400)).toBe(1); // 1 minute at 400 WPM
    });

    test('rounds up', () => {
      const text = Array(250).fill('word').join(' '); // 250 words
      expect(estimateReadingTime(text)).toBe(2); // Rounds up to 2 minutes
    });
  });

  describe('truncateText', () => {
    test('truncates long text', () => {
      const text = 'This is a long text that needs truncation';
      const truncated = truncateText(text, 20);
      expect(truncated.length).toBe(20);
      expect(truncated.endsWith('...')).toBe(true);
    });

    test('returns original if shorter than max', () => {
      expect(truncateText('short', 100)).toBe('short');
    });

    test('uses custom ellipsis', () => {
      const truncated = truncateText('long text here', 12, '…');
      expect(truncated.endsWith('…')).toBe(true);
    });
  });

  describe('truncateAtWord', () => {
    test('truncates at word boundary', () => {
      const text = 'This is a long sentence with many words';
      const truncated = truncateAtWord(text, 25);
      expect(truncated.endsWith('...')).toBe(true);
      // Should end with a complete word followed by ellipsis (not cut mid-word)
      // e.g., "This is a long..." not "This is a lon..."
      expect(truncated.length).toBeLessThanOrEqual(25);
    });

    test('returns original if shorter than max', () => {
      expect(truncateAtWord('short', 100)).toBe('short');
    });
  });

  describe('removeStopWords', () => {
    test('removes common stop words', () => {
      const text = 'the quick brown fox is in the box';
      const result = removeStopWords(text);
      expect(result).not.toContain('the');
      expect(result).not.toContain('is');
      expect(result).not.toContain('in');
      expect(result).toContain('quick');
      expect(result).toContain('brown');
      expect(result).toContain('fox');
    });
  });

  describe('extractKeywords', () => {
    test('extracts keywords by frequency', () => {
      const text = 'javascript is great. javascript is powerful. javascript rules.';
      const keywords = extractKeywords(text, 3);
      expect(keywords[0]).toBe('javascript');
    });

    test('excludes stop words', () => {
      const text = 'the the the apple banana cherry';
      const keywords = extractKeywords(text, 5);
      expect(keywords).not.toContain('the');
      expect(keywords).toContain('apple');
    });

    test('returns empty array for empty input', () => {
      expect(extractKeywords('')).toEqual([]);
    });

    test('limits results', () => {
      const text = 'one two three four five six seven eight nine ten';
      const keywords = extractKeywords(text, 3);
      expect(keywords.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getTextPreview', () => {
    test('returns preview of text', () => {
      const text = 'This is a   long\n\ntext with   weird spacing.';
      const preview = getTextPreview(text, 50);
      expect(preview.length).toBeLessThanOrEqual(50);
    });

    test('handles empty input', () => {
      expect(getTextPreview('')).toBe('');
    });
  });

  describe('isMostlyAscii', () => {
    test('returns true for ASCII text', () => {
      expect(isMostlyAscii('Hello World!')).toBe(true);
    });

    test('returns false for mostly non-ASCII', () => {
      expect(isMostlyAscii('你好世界')).toBe(false);
    });

    test('handles empty input', () => {
      expect(isMostlyAscii('')).toBe(true);
    });

    test('uses custom threshold', () => {
      const mixed = 'Hello 你好'; // ~70% ASCII
      expect(isMostlyAscii(mixed, 0.5)).toBe(true);
      expect(isMostlyAscii(mixed, 0.9)).toBe(false);
    });
  });

  describe('generateContentHash', () => {
    test('generates consistent hash for same content', () => {
      const hash1 = generateContentHash('test content');
      const hash2 = generateContentHash('test content');
      expect(hash1).toBe(hash2);
    });

    test('generates different hash for different content', () => {
      const hash1 = generateContentHash('content a');
      const hash2 = generateContentHash('content b');
      expect(hash1).not.toBe(hash2);
    });

    test('returns string hash', () => {
      const hash = generateContentHash('test');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});
