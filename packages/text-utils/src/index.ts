/**
 * @rag/text-utils
 *
 * Text processing utilities for the RAG system.
 * Includes chunking, extraction, and normalization utilities.
 *
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================
export type {
  ChunkOptions,
  ChunkMetadata,
  TextChunk,
  ExtractionResult,
  SupportedMimeType,
} from './types';

// ============================================================================
// Text Chunking Utilities
// ============================================================================
export {
  recursiveChunkText,
  chunkTextWithMetadata,
  chunkText,
  estimateChunkCount,
  splitBySentences,
  splitByParagraphs,
} from './chunker';

// ============================================================================
// Text Extraction Utilities
// ============================================================================
export {
  extractText,
  extractTextWithMetadata,
  extractTextFromBuffer,
  isTextMimeType,
  isSupportedMimeType,
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
} from './extractor';

// ============================================================================
// Text Normalization Utilities
// ============================================================================
export {
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
} from './normalizer';
