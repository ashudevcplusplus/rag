import fs from 'fs';
import type { ExtractionResult, SupportedMimeType } from './types';

// Import pdf.js-extract for layout-aware PDF extraction
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFExtractLib = require('pdf.js-extract');
const PDFExtract = PDFExtractLib.PDFExtract;

/**
 * Interface for pdf.js-extract text item
 */
interface PDFTextItem {
  x: number;
  y: number;
  str: string;
  width: number;
  height: number;
  fontName?: string;
}

/**
 * Interface for pdf.js-extract page
 */
interface PDFPage {
  pageInfo: { num: number; width: number; height: number };
  content: PDFTextItem[];
}

/**
 * Interface for pdf.js-extract result
 */
interface PDFExtractResult {
  pages: PDFPage[];
  pdfInfo?: {
    numPages: number;
  };
}

/**
 * Configuration options for PDF extraction
 */
export interface PDFExtractionOptions {
  /**
   * Whether to use layout-aware extraction (preserves table structure)
   * @default true
   */
  preserveLayout?: boolean;

  /**
   * Minimum gap (in PDF units) to insert a tab between text items
   * @default 10
   */
  columnGapThreshold?: number;

  /**
   * Y-coordinate tolerance for grouping text on the same line
   * @default 3
   */
  lineHeightTolerance?: number;
}

/**
 * MIME types that can be read directly as text
 */
const TEXT_MIME_TYPES: Set<string> = new Set([
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/markdown',
  'text/csv',
  'text/xml',
  'application/json',
  'application/xml',
  'application/javascript',
  // Email
  'message/rfc822',
  'application/vnd.ms-outlook',
  // Code
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-go',
  'text/typescript',
]);

/**
 * Check if a MIME type is a text-based type
 */
export function isTextMimeType(mimeType: string): boolean {
  return mimeType.startsWith('text/') || TEXT_MIME_TYPES.has(mimeType);
}

/**
 * Check if a MIME type is supported for extraction
 */
export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return isTextMimeType(mimeType) || mimeType === 'application/pdf';
}

/**
 * Extract text from PDF with layout preservation using pdf.js-extract
 *
 * This function:
 * 1. Extracts text with x,y coordinates
 * 2. Groups text items by their y-coordinate (same row)
 * 3. Sorts by x-coordinate within each row
 * 4. Adds tabs between columns based on spacing
 * 5. Reconstructs text preserving table structure
 *
 * @param buffer - PDF file buffer
 * @param options - Extraction options
 * @returns Extracted text with preserved layout
 */
async function extractPDFWithLayout(
  buffer: Buffer,
  options: PDFExtractionOptions = {}
): Promise<{ text: string; pageCount: number }> {
  const { columnGapThreshold = 10, lineHeightTolerance = 3 } = options;

  const pdfExtract = new PDFExtract();

  return new Promise((resolve, reject) => {
    pdfExtract.extractBuffer(buffer, {}, (err: Error | null, data: PDFExtractResult) => {
      if (err) {
        reject(err);
        return;
      }

      const pageTexts: string[] = [];

      for (const page of data.pages) {
        const pageText = reconstructPageLayout(page.content, columnGapThreshold, lineHeightTolerance);
        pageTexts.push(pageText);
      }

      resolve({
        text: pageTexts.join('\n\n--- Page Break ---\n\n'),
        pageCount: data.pages.length,
      });
    });
  });
}

/**
 * Reconstruct page layout from text items with coordinates
 */
function reconstructPageLayout(
  items: PDFTextItem[],
  columnGapThreshold: number,
  lineHeightTolerance: number
): string {
  if (!items || items.length === 0) return '';

  // Group text items by their y-coordinate (same line)
  const lines: Map<number, PDFTextItem[]> = new Map();

  for (const item of items) {
    if (!item.str || item.str.trim() === '') continue;

    // Find existing line within tolerance
    let lineY: number | null = null;
    for (const existingY of lines.keys()) {
      if (Math.abs(existingY - item.y) <= lineHeightTolerance) {
        lineY = existingY;
        break;
      }
    }

    if (lineY === null) {
      lineY = item.y;
      lines.set(lineY, []);
    }

    lines.get(lineY)!.push(item);
  }

  // Sort lines by y-coordinate (top to bottom)
  const sortedLines = Array.from(lines.entries()).sort((a, b) => a[0] - b[0]);

  const textLines: string[] = [];

  for (const [, lineItems] of sortedLines) {
    // Sort items within line by x-coordinate (left to right)
    lineItems.sort((a, b) => a.x - b.x);

    // Build line text with spacing based on gaps
    let lineText = '';
    let prevEndX = 0;

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const gap = item.x - prevEndX;

      if (i > 0) {
        if (gap > columnGapThreshold * 3) {
          // Large gap - likely a table column separator
          lineText += '\t\t';
        } else if (gap > columnGapThreshold) {
          // Medium gap - single tab
          lineText += '\t';
        } else if (gap > 2) {
          // Small gap - space
          lineText += ' ';
        }
        // Very small or negative gap - concatenate directly
      }

      lineText += item.str;
      prevEndX = item.x + item.width;
    }

    if (lineText.trim()) {
      textLines.push(lineText);
    }
  }

  return textLines.join('\n');
}

/**
 * Extract text from various file types
 *
 * Supports:
 * - Text files (text/*, application/json)
 * - PDF files (application/pdf) - with layout-aware extraction for tables
 *
 * @param filePath - Path to the file to extract text from
 * @param mimeType - MIME type of the file
 * @param options - Optional PDF extraction options
 * @returns Extracted text content
 * @throws Error if file type is not supported
 *
 * @example
 * ```ts
 * // Basic extraction
 * const text = await extractText('/path/to/document.pdf', 'application/pdf');
 *
 * // With layout preservation options
 * const text = await extractText('/path/to/document.pdf', 'application/pdf', {
 *   preserveLayout: true,
 *   columnGapThreshold: 15
 * });
 * ```
 */
export async function extractText(
  filePath: string,
  mimeType: string,
  options: PDFExtractionOptions = {}
): Promise<string> {
  // Handle text-based files directly
  if (isTextMimeType(mimeType)) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  // Handle PDF files with layout-aware extraction
  if (mimeType === 'application/pdf') {
    const { preserveLayout = true } = options;
    const dataBuffer = fs.readFileSync(filePath);

    if (preserveLayout) {
      // Use pdf.js-extract for layout-aware extraction (preserves tables)
      try {
        const result = await extractPDFWithLayout(dataBuffer, options);
        return result.text;
      } catch (error) {
        // Fallback to pdf-parse if pdf.js-extract fails
        console.warn('pdf.js-extract failed, falling back to pdf-parse:', error);
        const pdf = await import('pdf-parse');
        const data = await pdf.default(dataBuffer);
        return data.text;
      }
    } else {
      // Use simple pdf-parse extraction
      const pdf = await import('pdf-parse');
      const data = await pdf.default(dataBuffer);
      return data.text;
    }
  }

  // For other types, try reading as text
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Extract text from various file types with metadata
 *
 * @param filePath - Path to the file to extract text from
 * @param mimeType - MIME type of the file
 * @param options - Optional PDF extraction options
 * @returns Extraction result with text and metadata
 * @throws Error if file type is not supported
 *
 * @example
 * ```ts
 * const result = await extractTextWithMetadata('/path/to/document.pdf', 'application/pdf');
 * console.log(`Extracted ${result.text.length} characters from ${result.pageCount} pages`);
 * ```
 */
export async function extractTextWithMetadata(
  filePath: string,
  mimeType: string,
  options: PDFExtractionOptions = {}
): Promise<ExtractionResult> {
  // Handle text-based files directly
  if (isTextMimeType(mimeType)) {
    const text = fs.readFileSync(filePath, 'utf-8');
    return {
      text,
      mimeType,
    };
  }

  // Handle PDF files with layout-aware extraction
  if (mimeType === 'application/pdf') {
    const { preserveLayout = true } = options;
    const dataBuffer = fs.readFileSync(filePath);

    if (preserveLayout) {
      try {
        const result = await extractPDFWithLayout(dataBuffer, options);
        return {
          text: result.text,
          pageCount: result.pageCount,
          mimeType,
        };
      } catch (error) {
        console.warn('pdf.js-extract failed, falling back to pdf-parse:', error);
        const pdf = await import('pdf-parse');
        const data = await pdf.default(dataBuffer);
        return {
          text: data.text,
          pageCount: data.numpages,
          mimeType,
        };
      }
    } else {
      const pdf = await import('pdf-parse');
      const data = await pdf.default(dataBuffer);
      return {
        text: data.text,
        pageCount: data.numpages,
        mimeType,
      };
    }
  }

  // For other types, try reading as text
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    return {
      text,
      mimeType,
    };
  } catch {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Extract text from a buffer
 *
 * @param buffer - Buffer containing file content
 * @param mimeType - MIME type of the content
 * @param options - Optional PDF extraction options
 * @returns Extracted text content
 * @throws Error if file type is not supported
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  options: PDFExtractionOptions = {}
): Promise<string> {
  // Handle text-based files directly
  if (isTextMimeType(mimeType)) {
    return buffer.toString('utf-8');
  }

  // Handle PDF files with layout-aware extraction
  if (mimeType === 'application/pdf') {
    const { preserveLayout = true } = options;

    if (preserveLayout) {
      try {
        const result = await extractPDFWithLayout(buffer, options);
        return result.text;
      } catch (error) {
        console.warn('pdf.js-extract failed, falling back to pdf-parse:', error);
        const pdf = await import('pdf-parse');
        const data = await pdf.default(buffer);
        return data.text;
      }
    } else {
      const pdf = await import('pdf-parse');
      const data = await pdf.default(buffer);
      return data.text;
    }
  }

  // For other types, try converting to string
  try {
    return buffer.toString('utf-8');
  } catch {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string | null {
  const mimeToExtension: Record<string, string> = {
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'text/markdown': '.md',
    'text/csv': '.csv',
    'application/json': '.json',
    'application/pdf': '.pdf',
    'application/xml': '.xml',
  };

  return mimeToExtension[mimeType] ?? null;
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string | null {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  const extensionToMime: Record<string, string> = {
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.xml': 'application/xml',
  };

  return extensionToMime[ext.toLowerCase()] ?? null;
}
