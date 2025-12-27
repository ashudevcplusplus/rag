import {
  chunkDocument,
  chunkDocumentSync,
  chunkDocumentWithMetadata,
  preprocessText,
  isTabularContent,
  extractFinancialMetrics,
} from '../src';

describe('Document Chunker', () => {
  describe('chunkDocument', () => {
    it('should return empty array for empty input', async () => {
      expect(await chunkDocument('')).toEqual([]);
      expect(await chunkDocument('   ')).toEqual([]);
    });

    it('should return single chunk for small text', async () => {
      const text = 'This is a short document.';
      const chunks = await chunkDocument(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should chunk long text', async () => {
      const text = 'Lorem ipsum. '.repeat(200);
      const chunks = await chunkDocument(text, { chunkSize: 500 });
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(600); // Allow some overflow
      });
    });

    it('should use document type defaults', async () => {
      const text = 'Financial data. '.repeat(100);
      const financialChunks = await chunkDocument(text, { documentType: 'financial' });
      const legalChunks = await chunkDocument(text, { documentType: 'legal' });

      // Legal uses smaller chunks, so should have more
      expect(legalChunks.length).toBeGreaterThanOrEqual(financialChunks.length);
    });

    it('should handle page breaks as separators', async () => {
      const text = `Page 1 content here.
      
--- Page Break ---

Page 2 content here.`;
      const chunks = await chunkDocument(text, { documentType: 'financial' });
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('chunkDocumentSync', () => {
    it('should return empty array for empty input', () => {
      expect(chunkDocumentSync('')).toEqual([]);
    });

    it('should chunk text synchronously', () => {
      const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
      const chunks = chunkDocumentSync(text, { chunkSize: 30 });
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should add whitespace separator when overlap does not end with whitespace', () => {
      // Create text that will be split into chunks where overlap concatenation needs a space
      const text = 'First paragraph ends here.\n\nSecond paragraph starts here.\n\nThird paragraph follows.';
      const chunks = chunkDocumentSync(text, { chunkSize: 40, chunkOverlap: 10, preprocess: false });

      // Check that chunks with overlap don't have malformed concatenation like "here.Second"
      for (const chunk of chunks) {
        // Should not have period immediately followed by capital letter without space
        expect(chunk).not.toMatch(/\.[A-Z]/);
      }
    });

    it('should not add extra whitespace when overlap already ends with whitespace', () => {
      const text = 'Word one \n\nWord two \n\nWord three';
      const chunks = chunkDocumentSync(text, { chunkSize: 20, chunkOverlap: 5, preprocess: false });

      // Should not have double spaces
      for (const chunk of chunks) {
        expect(chunk).not.toMatch(/  /);
      }
    });
  });

  describe('chunkDocumentWithMetadata', () => {
    it('should include metadata with chunks', async () => {
      const text = `First page content.

--- Page Break ---

Second page content.`;

      const chunks = await chunkDocumentWithMetadata(text);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].metadata).toBeDefined();
      expect(chunks[0].metadata?.index).toBe(0);
      expect(chunks[0].metadata?.length).toBeGreaterThan(0);
    });

    it('should track page numbers', async () => {
      const text = `Page 1 with some content here.

--- Page Break ---

Page 2 with different content.

--- Page Break ---

Page 3 with final content.`;

      const chunks = await chunkDocumentWithMetadata(text, { chunkSize: 200, chunkOverlap: 20 });
      const pageNumbers = chunks.map((c) => c.metadata?.pageNumber).filter(Boolean);
      expect(pageNumbers.length).toBeGreaterThan(0);
    });
  });
});

describe('Preprocessor', () => {
  describe('preprocessText', () => {
    it('should remove page numbers (PDF format)', () => {
      const text = `Content here

1/6

More content

2/6`;
      const result = preprocessText(text, { sourceFormat: 'pdf' });
      expect(result).not.toContain('1/6');
      expect(result).not.toContain('2/6');
      expect(result).toContain('Content here');
    });

    it('should remove standalone URLs (PDF format)', () => {
      const text = `Some content

https://example.com/page

More content`;
      const result = preprocessText(text, { sourceFormat: 'pdf' });
      expect(result).not.toContain('https://example.com');
      expect(result).toContain('Some content');
    });

    it('should normalize excessive newlines', () => {
      const text = 'Line 1\n\n\n\n\n\nLine 2';
      const result = preprocessText(text);
      expect(result).not.toContain('\n\n\n\n');
    });

    it('should remove duplicate content at page breaks (PDF format)', () => {
      const text = `This is duplicate content that spans pages

--- Page Break ---

This is duplicate content that spans pages`;
      const result = preprocessText(text, { sourceFormat: 'pdf' });
      const occurrences = (result.match(/This is duplicate content/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('should safely handle large content duplication without stack overflow', () => {
      // Create a large string (100KB)
      const largeContent = 'A'.repeat(50000);
      const marker = '--- Page Break ---';
      // Simulate duplicate overlap of 100 chars
      const duplicatePart = 'D'.repeat(100);
      
      const text = `${largeContent}${duplicatePart}\n\n${marker}\n\n${duplicatePart}${largeContent}`;
      
      const result = preprocessText(text, { sourceFormat: 'text' });
      
      // Should be smaller than original due to duplicate removal
      if (result.length === text.length) {
        // If lengths are equal, duplication removal failed.
        // This might happen if 'text' format configuration isn't picked up correctly
        // or if the matching logic is too strict.
        // Let's check if we can remove the assertion for now if it's flaky,
        // but it's better to ensure it works.
        // console.log('Duplicate removal failed');
      }
      
      expect(result.length).toBeLessThan(text.length);
      expect(result.length).toBeGreaterThan(100000);
      
      const parts = result.split(marker);
      expect(parts[1].trim().startsWith('A')).toBe(true);
    });

    it('should apply custom removal patterns', () => {
      const text = 'Keep this. Remove BADWORD here. Keep this too.';
      const result = preprocessText(text, {
        customRemovalPatterns: ['BADWORD'],
      });
      expect(result).not.toContain('BADWORD');
    });

    it('should decode HTML entities correctly instead of deleting them', () => {
      const text = '<p>Hello&nbsp;World</p><p>Rock &amp; Roll</p><p>&lt;tag&gt;</p>';
      const result = preprocessText(text, { sourceFormat: 'html', stripHtmlTags: true });
      // Entities should be decoded, not deleted
      expect(result).toContain('Hello World'); // &nbsp; -> space
      expect(result).toContain('Rock & Roll'); // &amp; -> &
      expect(result).toContain('<tag>'); // &lt; and &gt; -> < and >
      // Should NOT have malformed text
      expect(result).not.toContain('HelloWorld'); // Would happen if &nbsp; was deleted
      expect(result).not.toContain('Rock Roll'); // Would happen if &amp; was deleted
    });

    it('should decode numeric HTML entities', () => {
      const text = '<p>Copyright &#169; 2025</p>';
      const result = preprocessText(text, { sourceFormat: 'html', stripHtmlTags: true });
      expect(result).toContain('©'); // &#169; -> ©
    });
  });

  describe('isTabularContent', () => {
    it('should detect tab-separated content', () => {
      const tabular = `Header1\t\tHeader2\t\tHeader3
Value1\t\tValue2\t\tValue3
Value4\t\tValue5\t\tValue6`;
      expect(isTabularContent(tabular)).toBe(true);
    });

    it('should return false for regular text', () => {
      const prose = `This is a regular paragraph with no table structure.
It continues on multiple lines but has no columns.`;
      expect(isTabularContent(prose)).toBe(false);
    });

    it('should detect numeric columns', () => {
      const numbers = `100.00   200.00   300.00
150.00   250.00   350.00
200.00   300.00   400.00`;
      expect(isTabularContent(numbers)).toBe(true);
    });
  });

  describe('extractFinancialMetrics', () => {
    it('should extract market cap', () => {
      const text = 'Market cap: 404.04B (INR)';
      const metrics = extractFinancialMetrics(text);
      expect(metrics['Market Cap']).toBe('404.04B (INR)');
    });

    it('should extract P/E ratio', () => {
      const text = 'P/E (TTM) 49.80 (INR)';
      const metrics = extractFinancialMetrics(text);
      expect(metrics['P/E Ratio']).toBeDefined();
    });

    it('should extract multiple metrics', () => {
      const text = `Market cap 100B
EPS (TTM) 57.69
Dividend Yield 0.35%`;
      const metrics = extractFinancialMetrics(text);
      expect(Object.keys(metrics).length).toBeGreaterThanOrEqual(2);
    });
  });
});

