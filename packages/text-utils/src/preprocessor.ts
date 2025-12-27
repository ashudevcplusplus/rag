/**
 * Generic Text Preprocessing Module
 *
 * Extensible utilities to clean text extracted from various document types.
 * Supports PDF, HTML, Markdown, Email, Code, and plain text.
 */

/**
 * Supported source file formats
 */
export type SourceFormat = 'pdf' | 'html' | 'markdown' | 'email' | 'code' | 'text' | 'docx' | 'csv';

/**
 * Base configuration options for text preprocessing
 */
export interface PreprocessorOptions {
  /** Source format for specialized preprocessing @default 'text' */
  sourceFormat?: SourceFormat;
  /** Remove duplicate lines at boundaries @default true */
  removeDuplicates?: boolean;
  /** Remove common header/footer patterns @default true */
  removeHeadersFooters?: boolean;
  /** Normalize whitespace @default true */
  normalizeWhitespace?: boolean;
  /** Custom regex patterns to remove */
  customRemovalPatterns?: string[];
  /** Page/section break marker @default '--- Page Break ---' */
  pageBreakMarker?: string;
  /** Preserve code blocks (for markdown/code) @default true */
  preserveCodeBlocks?: boolean;
  /** Remove HTML tags @default true for html */
  stripHtmlTags?: boolean;
  /** Remove email signatures @default true for email */
  removeEmailSignatures?: boolean;
  /** Remove quoted replies in email @default false */
  removeQuotedReplies?: boolean;
  /** Language hint for code preprocessing */
  codeLanguage?: string;
}

/**
 * Document type-specific patterns for cleaning
 */
interface DocumentPatterns {
  headerFooter: RegExp[];
  artifacts: RegExp[];
  duplicateBoundary: string;
}

const DOCUMENT_PATTERNS: Record<SourceFormat, DocumentPatterns> = {
  pdf: {
    headerFooter: [
      /^\s*(\d+\s*\/\s*\d+|page\s+\d+\s*(of\s+\d+)?)\s*$/gim,
      /^\s*https?:\/\/[^\s]+\s*$/gim,
      /^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*$/gim,
    ],
    artifacts: [
      /\f/g, // Form feed characters
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, // Control chars
    ],
    duplicateBoundary: '--- Page Break ---',
  },
  html: {
    headerFooter: [
      /<!--[\s\S]*?-->/g, // HTML comments
      /<script[\s\S]*?<\/script>/gi,
      /<style[\s\S]*?<\/style>/gi,
      /<noscript[\s\S]*?<\/noscript>/gi,
    ],
    artifacts: [
      /&nbsp;/g,
      /&amp;/g,
      /&lt;/g,
      /&gt;/g,
      /&quot;/g,
      /&#\d+;/g,
    ],
    duplicateBoundary: '',
  },
  markdown: {
    headerFooter: [
      // Page numbers
      /^\s*(\d+\s*\/\s*\d+|page\s+\d+\s*(of\s+\d+)?)\s*$/gim,
      // Standalone URLs
      /^\s*https?:\/\/[^\s]+\s*$/gim,
      // Timestamps
      /^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*$/gim,
    ],
    artifacts: [
      /^\[.*?\]:\s*http.*$/gm, // Reference-style links
    ],
    duplicateBoundary: '---',
  },
  email: {
    headerFooter: [
      /^(From|To|Cc|Bcc|Subject|Date|Reply-To|Message-ID|MIME-Version|Content-Type):\s*.+$/gim,
      /^X-[\w-]+:\s*.+$/gim, // X-headers
    ],
    artifacts: [
      /^--\s*$/gm, // Signature delimiter
      /^_{3,}$/gm, // Underscores
      /^-{3,}$/gm, // Dashes
    ],
    duplicateBoundary: '',
  },
  code: {
    headerFooter: [
      /^#!\/.*$/m, // Shebang
      /^\/\*[\s\S]*?\*\//gm, // Block comments (if removing)
    ],
    artifacts: [],
    duplicateBoundary: '',
  },
  text: {
    headerFooter: [
      // Page numbers: "1/6", "Page 1 of 6", "Page 2", etc.
      /^\s*(\d+\s*\/\s*\d+|page\s+\d+\s*(of\s+\d+)?)\s*$/gim,
      // Standalone URLs on their own line
      /^\s*https?:\/\/[^\s]+\s*$/gim,
      // Timestamps like "06/10/2025, 22:10"
      /^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*$/gim,
    ],
    artifacts: [],
    duplicateBoundary: '--- Page Break ---',
  },
  docx: {
    headerFooter: [
      /^\s*(\d+\s*\/\s*\d+|page\s+\d+\s*(of\s+\d+)?)\s*$/gim,
    ],
    artifacts: [
      /\[bookmark:\s*\w+\]/gi,
      /\[TOC\]/gi,
    ],
    duplicateBoundary: '--- Page Break ---',
  },
  csv: {
    headerFooter: [],
    artifacts: [],
    duplicateBoundary: '',
  },
};

/**
 * Calculate string similarity (0-1) using simple character comparison
 */
export function similarityRatio(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.includes(shorter)) return shorter.length / longer.length;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

/**
 * Check if text appears to be tabular data
 */
export function isTabularContent(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return false;

  const tabularLines = lines.filter(
    (line) =>
      (line.match(/\t/g) || []).length >= 2 ||
      (line.match(/,/g) || []).length >= 2 ||
      /[\d,.]+\s{3,}[\d,.]+/.test(line)
  );

  return tabularLines.length / lines.length > 0.3;
}

/**
 * Detect source format from content heuristics
 */
export function detectSourceFormat(text: string, filename?: string): SourceFormat {
  // Check filename extension first
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const extMap: Record<string, SourceFormat> = {
      pdf: 'pdf',
      html: 'html',
      htm: 'html',
      md: 'markdown',
      markdown: 'markdown',
      eml: 'email',
      msg: 'email',
      js: 'code',
      ts: 'code',
      py: 'code',
      java: 'code',
      cpp: 'code',
      c: 'code',
      go: 'code',
      rs: 'code',
      rb: 'code',
      php: 'code',
      docx: 'docx',
      doc: 'docx',
      csv: 'csv',
      txt: 'text',
    };
    if (ext && extMap[ext]) return extMap[ext];
  }

  // Content-based detection
  if (/<html|<body|<div|<p\s|<span/i.test(text)) return 'html';
  if (/^#{1,6}\s|^\*\*.*\*\*|^\[.*\]\(.*\)/m.test(text)) return 'markdown';
  if (/^(From|To|Subject):\s/m.test(text)) return 'email';
  if (/^(function|class|const|let|var|import|def|package)\s/m.test(text)) return 'code';
  if (isTabularContent(text) && text.includes(',')) return 'csv';

  return 'text';
}

/**
 * Extract key-value metrics from text (generic version)
 */
export function extractMetrics(text: string, patterns?: [string, RegExp][]): Record<string, string> {
  const metrics: Record<string, string> = {};
  const defaultPatterns: [string, RegExp][] = patterns || [
    ['Title', /(?:title|name)[:\s]+([^\n]+)/i],
    ['Date', /(?:date|created|modified)[:\s]+([^\n]+)/i],
    ['Author', /(?:author|by|writer)[:\s]+([^\n]+)/i],
    ['Version', /(?:version|v\.?)[:\s]+([^\n]+)/i],
  ];

  for (const [name, pattern] of defaultPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) metrics[name] = match[1].trim();
  }
  return metrics;
}

/**
 * Extract common financial metrics from text
 */
export function extractFinancialMetrics(text: string): Record<string, string> {
  return extractMetrics(text, [
    ['Market Cap', /market\s*cap[:\s]+([^\n]+)/i],
    ['P/E Ratio', /p\/?e\s*(?:\(ttm\))?[:\s]+([^\n]+)/i],
    ['EPS', /eps\s*(?:\(ttm\))?[:\s]+([^\n]+)/i],
    ['Dividend Yield', /dividend\s*yield[:\s]+([^\n]+)/i],
    ['Revenue', /(?:revenue|sales)[:\s]+([^\n]+)/i],
    ['Net Income', /net\s*income[:\s]+([^\n]+)/i],
  ]);
}

/**
 * Strip HTML tags from text
 */
function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
    .replace(/<\/th>/gi, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

/**
 * Process email-specific content
 */
function preprocessEmail(text: string, options: PreprocessorOptions): string {
  let result = text;

  // Remove email headers
  if (options.removeHeadersFooters !== false) {
    for (const pattern of DOCUMENT_PATTERNS.email.headerFooter) {
      result = result.replace(pattern, '');
    }
  }

  // Remove quoted replies (lines starting with >)
  if (options.removeQuotedReplies) {
    result = result.replace(/^>.*$/gm, '');
  }

  // Remove signature blocks
  if (options.removeEmailSignatures !== false) {
    // Common signature patterns
    result = result
      .replace(/^--\s*\n[\s\S]*$/m, '') // -- signature
      .replace(/^_{10,}\s*\n[\s\S]*$/m, '') // ___ signature
      .replace(/^Sent from my .*$/gim, '')
      .replace(/^Get Outlook for .*$/gim, '')
      .replace(/^This email and any attachments.*$/gim, '');
  }

  return result;
}

/**
 * Preserve code blocks while processing markdown
 */
function preserveAndRestoreCodeBlocks(
  text: string,
  processor: (t: string) => string
): string {
  const codeBlocks: string[] = [];

  // Extract fenced code blocks
  const withPlaceholders = text.replace(
    /```[\s\S]*?```|`[^`\n]+`/g,
    (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    }
  );

  // Process the text
  const processed = processor(withPlaceholders);

  // Restore code blocks
  return processed.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => codeBlocks[parseInt(index, 10)]);
}

/**
 * Main preprocessing function - cleans text based on document type
 *
 * @param text - Raw extracted text
 * @param options - Preprocessing options
 * @returns Cleaned text
 *
 * @example
 * ```ts
 * // Auto-detect source format
 * const cleaned = preprocessText(rawText);
 *
 * // Specify source format
 * const cleanedPdf = preprocessText(rawPdfText, { sourceFormat: 'pdf' });
 *
 * // HTML with tag stripping
 * const cleanedHtml = preprocessText(htmlContent, { sourceFormat: 'html', stripHtmlTags: true });
 * ```
 */
export function preprocessText(text: string, options: PreprocessorOptions = {}): string {
  const {
    sourceFormat = 'text',
    removeDuplicates = true,
    removeHeadersFooters = true,
    normalizeWhitespace = true,
    customRemovalPatterns = [],
    pageBreakMarker = '--- Page Break ---',
    preserveCodeBlocks: shouldPreserveCode = true,
    stripHtmlTags = sourceFormat === 'html',
  } = options;

  const patterns = DOCUMENT_PATTERNS[sourceFormat] || DOCUMENT_PATTERNS.text;
  let result = text;

  // Format-specific preprocessing
  if (sourceFormat === 'email') {
    result = preprocessEmail(result, options);
  }

  // Preserve code blocks for markdown
  if ((sourceFormat === 'markdown' || sourceFormat === 'code') && shouldPreserveCode) {
    result = preserveAndRestoreCodeBlocks(result, (t) => {
      let processed = t;

      // Apply header/footer removal
      if (removeHeadersFooters) {
        for (const pattern of patterns.headerFooter) {
          processed = processed.replace(pattern, '');
        }
      }

      // Apply artifact removal
      for (const pattern of patterns.artifacts) {
        processed = processed.replace(pattern, '');
      }

      return processed;
    });
  } else {
    // Standard processing for other types
    if (removeHeadersFooters) {
      for (const pattern of patterns.headerFooter) {
        result = result.replace(pattern, '');
      }
    }

    // Remove artifacts
    for (const pattern of patterns.artifacts) {
      result = result.replace(pattern, '');
    }
  }

  // Strip HTML tags if requested
  if (stripHtmlTags && sourceFormat === 'html') {
    result = stripHtml(result);
  }

  // Remove duplicates at section/page breaks
  if (removeDuplicates && patterns.duplicateBoundary) {
    const marker = pageBreakMarker || patterns.duplicateBoundary;
    
    // Split by marker to avoid regex stack overflow on large files
    const parts = result.split(marker);
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const prev = parts[i - 1];
        const curr = parts[i];
        
        // Get the end of previous section (trimmed, last 500 chars max for efficiency)
        const prevTrimmed = prev.trimEnd();
        const prevEnd = prevTrimmed.slice(-500);
        
        // Get the start of current section (trimmed, first 500 chars max)
        const currTrimmed = curr.trimStart();
        const currStart = currTrimmed.slice(0, 500);
        
        // Find the longest common overlap (suffix of prev == prefix of curr)
        // Iterate from max possible down to minimum (20) - first match is longest
        const maxLen = Math.min(prevEnd.length, currStart.length);
        let overlapLen = 0;
        for (let len = maxLen; len >= 20; len--) {
          const suffix = prevEnd.slice(-len);
          const prefix = currStart.slice(0, len);
          if (suffix === prefix) {
            overlapLen = len;
            break; // Found longest overlap
          }
        }
        
        // If we found an overlap >= 20 chars, remove it from the current section
        if (overlapLen >= 20) {
          parts[i] = curr.trimStart().slice(overlapLen);
        }
      }
      result = parts.join(marker);
    }
  }

  // Custom patterns
  for (const pattern of customRemovalPatterns) {
    try {
      result = result.replace(new RegExp(pattern, 'gim'), '');
    } catch {
      /* invalid regex, skip */
    }
  }

  // Normalize whitespace
  if (normalizeWhitespace) {
    result = result
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();
  }

  return result;
}

/**
 * Create a specialized preprocessor for a specific source format
 *
 * @param sourceFormat - The source format to create a preprocessor for
 * @param defaultOptions - Default options for this preprocessor
 * @returns A preprocessor function
 *
 * @example
 * ```ts
 * const pdfPreprocessor = createPreprocessor('pdf');
 * const cleaned = pdfPreprocessor(rawText);
 *
 * const emailPreprocessor = createPreprocessor('email', { removeQuotedReplies: true });
 * const cleanedEmail = emailPreprocessor(rawEmail);
 * ```
 */
export function createPreprocessor(
  sourceFormat: SourceFormat,
  defaultOptions: Omit<PreprocessorOptions, 'sourceFormat'> = {}
): (text: string, options?: Omit<PreprocessorOptions, 'sourceFormat'>) => string {
  return (text: string, options: Omit<PreprocessorOptions, 'sourceFormat'> = {}) => {
    return preprocessText(text, {
      ...defaultOptions,
      ...options,
      sourceFormat,
    });
  };
}

// Pre-built preprocessors for common types
export const pdfPreprocessor = createPreprocessor('pdf');
export const htmlPreprocessor = createPreprocessor('html', { stripHtmlTags: true });
export const markdownPreprocessor = createPreprocessor('markdown');
export const emailPreprocessor = createPreprocessor('email');
export const codePreprocessor = createPreprocessor('code');
export const textPreprocessor = createPreprocessor('text');
