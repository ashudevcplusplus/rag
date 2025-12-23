/**
 * Text Processing Utilities
 *
 * Re-exports from @rag/text-utils for backwards compatibility.
 * Import directly from @rag/text-utils for new code.
 *
 * @module text-processor
 */

// Re-export everything from @rag/text-utils for backwards compatibility
export {
  // Chunking utilities
  recursiveChunkText,
  chunkText,
  chunkTextWithMetadata,
  estimateChunkCount,
  splitBySentences,
  splitByParagraphs,
  // Extraction utilities
  extractText,
  extractTextWithMetadata,
  extractTextFromBuffer,
  isTextMimeType,
  isSupportedMimeType,
  // Normalization utilities
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
  // Types
  type ChunkOptions,
  type ChunkMetadata,
  type TextChunk,
  type ExtractionResult,
  type SupportedMimeType,
} from '@rag/text-utils';
