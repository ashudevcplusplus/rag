/**
 * Configuration options for the text chunker
 */
export interface ChunkOptions {
  /**
   * Maximum size of each chunk in characters
   * @default 1000
   */
  chunkSize?: number;

  /**
   * Number of overlapping characters between consecutive chunks
   * @default 200
   */
  chunkOverlap?: number;

  /**
   * Custom separators to use for splitting (in order of priority)
   * @default ['\n\n', '\n', '. ', ' ', '']
   */
  separators?: string[];

  /**
   * Whether to trim whitespace from chunks
   * @default true
   */
  trimChunks?: boolean;
}

/**
 * Metadata about a text chunk
 */
export interface ChunkMetadata {
  /** Zero-based index of the chunk */
  index: number;
  /** Starting character position in original text */
  startPos: number;
  /** Ending character position in original text */
  endPos: number;
  /** Length of the chunk in characters */
  length: number;
}

/**
 * A text chunk with optional metadata
 */
export interface TextChunk {
  /** The chunk content */
  content: string;
  /** Optional metadata about the chunk */
  metadata?: ChunkMetadata;
}

/**
 * Result from text extraction
 */
export interface ExtractionResult {
  /** Extracted text content */
  text: string;
  /** Number of pages (for PDFs) */
  pageCount?: number;
  /** Original file type */
  mimeType: string;
}

/**
 * Supported MIME types for text extraction
 */
export type SupportedMimeType =
  | 'text/plain'
  | 'text/html'
  | 'text/css'
  | 'text/javascript'
  | 'text/markdown'
  | 'text/csv'
  | 'application/json'
  | 'application/pdf'
  | 'application/xml';
