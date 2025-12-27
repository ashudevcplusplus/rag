import {
  recursiveChunkText,
  recursiveChunkTextSync,
  chunkText,
  chunkTextWithMetadata,
  chunkByCharacter,
  chunkByTokens,
  chunkMarkdown,
  chunkLatex,
  chunkCode,
  estimateChunkCount,
  splitBySentences,
  splitByParagraphs,
  createTextSplitter,
  RecursiveCharacterTextSplitter,
} from '../src/chunker';

describe('Chunker Utilities', () => {
  describe('recursiveChunkText (async with LangChain)', () => {
    test('returns empty array for empty input', async () => {
      expect(await recursiveChunkText('')).toEqual([]);
      expect(await recursiveChunkText('   ')).toEqual([]);
    });

    test('returns single chunk for text smaller than chunk size', async () => {
      const text = 'Short text';
      const chunks = await recursiveChunkText(text, { chunkSize: 1000 });
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Short text');
    });

    test('chunks text correctly with overlap', async () => {
      const text = 'This is a longer text that should be chunked with overlap between chunks.';
      const chunks = await recursiveChunkText(text, { chunkSize: 30, chunkOverlap: 10 });

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain('This');
      expect(chunks[chunks.length - 1]).toContain('chunks');
    });

    test('handles text with sentence boundaries', async () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = await recursiveChunkText(text, { chunkSize: 20, chunkOverlap: 5 });
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });

    test('trims whitespace from chunks by default', async () => {
      const text = '  Hello    World  ';
      const chunks = await recursiveChunkText(text);
      expect(chunks[0]).toBe('Hello    World');
    });

    test('handles text with no natural separators', async () => {
      const text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const chunks = await recursiveChunkText(text, { chunkSize: 20, chunkOverlap: 5 });
      expect(chunks.length).toBeGreaterThan(1);
    });

    test('handles whitespace-only text', async () => {
      const text = '   \n\n   \t   ';
      const chunks = await recursiveChunkText(text, { chunkSize: 100, chunkOverlap: 20 });
      expect(chunks).toEqual([]);
    });

    test('uses custom separators when provided', async () => {
      const text = 'Part1|Part2|Part3';
      const chunks = await recursiveChunkText(text, {
        chunkSize: 10,
        chunkOverlap: 2,
        separators: ['|', ''],
      });
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('recursiveChunkTextSync (sync fallback)', () => {
    test('returns empty array for empty input', () => {
      expect(recursiveChunkTextSync('')).toEqual([]);
      expect(recursiveChunkTextSync('   ')).toEqual([]);
    });

    test('returns single chunk for text smaller than chunk size', () => {
      const text = 'Short text';
      const chunks = recursiveChunkTextSync(text, { chunkSize: 1000 });
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Short text');
    });

    test('chunks text correctly', () => {
      const text = 'This is a longer text that should be chunked with overlap between chunks.';
      const chunks = recursiveChunkTextSync(text, { chunkSize: 30, chunkOverlap: 10 });
      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('chunkText (deprecated sync)', () => {
    test('is a sync alias for recursiveChunkTextSync', () => {
      const text = 'Test text for chunking that is long enough to be split into chunks';
      const chunks1 = chunkText(text, 30, 10);
      const chunks2 = recursiveChunkTextSync(text, { chunkSize: 30, chunkOverlap: 10 });
      expect(chunks1).toEqual(chunks2);
    });
  });

  describe('chunkTextWithMetadata', () => {
    test('returns chunks with metadata', async () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const chunks = await chunkTextWithMetadata(text, { chunkSize: 20, chunkOverlap: 5 });

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk, index) => {
        expect(chunk.content).toBeDefined();
        expect(chunk.metadata).toBeDefined();
        expect(chunk.metadata?.index).toBe(index);
        expect(chunk.metadata?.length).toBe(chunk.content.length);
      });
    });

    test('returns empty array for empty input', async () => {
      const chunks = await chunkTextWithMetadata('');
      expect(chunks).toEqual([]);
    });
  });

  describe('chunkByCharacter', () => {
    test('splits on specified separator', async () => {
      const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
      const chunks = await chunkByCharacter(text, { chunkSize: 20, chunkOverlap: 5 }, '\n\n');
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('returns empty array for empty input', async () => {
      expect(await chunkByCharacter('')).toEqual([]);
    });
  });

  describe('chunkByTokens', () => {
    test('splits text by tokens', async () => {
      const text =
        'This is a test sentence that should be split into multiple chunks based on token count.';
      const chunks = await chunkByTokens(text, { chunkSize: 10, chunkOverlap: 2 });
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('returns empty array for empty input', async () => {
      expect(await chunkByTokens('')).toEqual([]);
    });
  });

  describe('chunkMarkdown', () => {
    test('splits markdown text', async () => {
      const text = '# Header 1\n\nSome content.\n\n## Header 2\n\nMore content here.';
      const chunks = await chunkMarkdown(text, { chunkSize: 30, chunkOverlap: 5 });
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('returns empty array for empty input', async () => {
      expect(await chunkMarkdown('')).toEqual([]);
    });
  });

  describe('chunkLatex', () => {
    test('splits latex text', async () => {
      const text =
        '\\section{Introduction}\nSome text.\n\\section{Methods}\nMore text here with formulas.';
      const chunks = await chunkLatex(text, { chunkSize: 30, chunkOverlap: 5 });
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('returns empty array for empty input', async () => {
      expect(await chunkLatex('')).toEqual([]);
    });
  });

  describe('chunkCode', () => {
    test('splits JavaScript code', async () => {
      const code = `
function hello() {
  console.log("Hello");
}

function world() {
  console.log("World");
}
`;
      const chunks = await chunkCode(code, 'js', { chunkSize: 50, chunkOverlap: 10 });
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('splits Python code', async () => {
      const code = `
def hello():
    print("Hello")

def world():
    print("World")
`;
      const chunks = await chunkCode(code, 'python', { chunkSize: 50, chunkOverlap: 10 });
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('returns empty array for empty input', async () => {
      expect(await chunkCode('', 'js')).toEqual([]);
    });
  });

  describe('estimateChunkCount', () => {
    test('returns 1 for text smaller than chunk size', () => {
      expect(estimateChunkCount(500, 1000, 200)).toBe(1);
    });

    test('estimates correctly for larger text', () => {
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

  describe('createTextSplitter', () => {
    test('creates a RecursiveCharacterTextSplitter', () => {
      const splitter = createTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
      expect(splitter).toBeInstanceOf(RecursiveCharacterTextSplitter);
    });

    test('can be used to split text', async () => {
      const splitter = createTextSplitter({ chunkSize: 20, chunkOverlap: 5 });
      const chunks = await splitter.splitText('This is a test text for the custom splitter.');
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('RecursiveCharacterTextSplitter export', () => {
    test('can be used directly', async () => {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 50,
        chunkOverlap: 10,
      });
      const chunks = await splitter.splitText('This is a longer text to test the direct usage.');
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
