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
// Text Chunking Utilities (LangChain-powered)
// ============================================================================
export {
  // Main chunking functions
  recursiveChunkText,
  recursiveChunkTextSync,
  chunkTextWithMetadata,
  chunkText,
  // Specialized chunkers
  chunkByCharacter,
  chunkByTokens,
  chunkMarkdown,
  chunkLatex,
  chunkCode,
  // Utility functions
  estimateChunkCount,
  splitBySentences,
  splitByParagraphs,
  createTextSplitter,
  // Re-exported LangChain splitters for direct access
  RecursiveCharacterTextSplitter,
  CharacterTextSplitter,
  TokenTextSplitter,
  MarkdownTextSplitter,
  LatexTextSplitter,
  SupportedTextSplitterLanguages,
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
