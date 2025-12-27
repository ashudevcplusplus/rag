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
  type PDFExtractionOptions,
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

// ============================================================================
// Text Preprocessing Utilities (Multi-format document cleanup)
// ============================================================================
export {
  preprocessText,
  createPreprocessor,
  detectSourceFormat,
  isTabularContent,
  extractMetrics,
  extractFinancialMetrics,
  similarityRatio,
  // Pre-built preprocessors
  pdfPreprocessor,
  htmlPreprocessor,
  markdownPreprocessor,
  emailPreprocessor,
  codePreprocessor,
  textPreprocessor,
  type PreprocessorOptions,
  type SourceFormat,
} from './preprocessor';

// ============================================================================
// Document-Aware Chunking (Tables, Financial Docs, etc.)
// ============================================================================
export {
  chunkDocument,
  chunkDocumentSync,
  chunkDocumentWithMetadata,
  type DocumentType,
  type DocumentChunkOptions,
  type DocumentChunkMetadata,
  type DocumentChunk,
} from './document-chunker';
