import fs from 'fs';
import type { ExtractionResult, SupportedMimeType } from './types';

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
 * Extract text from various file types
 *
 * Supports:
 * - Text files (text/*, application/json)
 * - PDF files (application/pdf)
 *
 * @param filePath - Path to the file to extract text from
 * @param mimeType - MIME type of the file
 * @returns Extracted text content
 * @throws Error if file type is not supported
 *
 * @example
 * ```ts
 * const text = await extractText('/path/to/document.pdf', 'application/pdf');
 * console.log(text);
 * ```
 */
export async function extractText(filePath: string, mimeType: string): Promise<string> {
  // Handle text-based files directly
  if (isTextMimeType(mimeType)) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  // Handle PDF files
  if (mimeType === 'application/pdf') {
    // Dynamic import to avoid loading pdf-parse when not needed
    const pdf = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf.default(dataBuffer);
    return data.text;
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
  mimeType: string
): Promise<ExtractionResult> {
  // Handle text-based files directly
  if (isTextMimeType(mimeType)) {
    const text = fs.readFileSync(filePath, 'utf-8');
    return {
      text,
      mimeType,
    };
  }

  // Handle PDF files
  if (mimeType === 'application/pdf') {
    const pdf = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf.default(dataBuffer);
    return {
      text: data.text,
      pageCount: data.numpages,
      mimeType,
    };
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
 * @returns Extracted text content
 * @throws Error if file type is not supported
 */
export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  // Handle text-based files directly
  if (isTextMimeType(mimeType)) {
    return buffer.toString('utf-8');
  }

  // Handle PDF files
  if (mimeType === 'application/pdf') {
    const pdf = await import('pdf-parse');
    const data = await pdf.default(buffer);
    return data.text;
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
