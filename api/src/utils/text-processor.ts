/**
 * Text Processing Utilities
 *
 * Re-exports from @rag/text-utils for backwards compatibility.
 * Import directly from @rag/text-utils for new code.
 *
 * @module text-processor
 */

// Import sync version and re-export as recursiveChunkText for backwards compatibility
import { recursiveChunkTextSync } from '@rag/text-utils';

// Re-export sync version as the default for backwards compatibility
export { recursiveChunkTextSync as recursiveChunkText };

// Re-export everything else from @rag/text-utils
export {
  // Chunking utilities - async versions (LangChain-powered)
  recursiveChunkText as recursiveChunkTextAsync,
  recursiveChunkTextSync,
  chunkText,
  chunkTextWithMetadata,
  // Specialized chunkers (async, LangChain-powered)
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
  // LangChain splitters
  RecursiveCharacterTextSplitter,
  CharacterTextSplitter,
  TokenTextSplitter,
  MarkdownTextSplitter,
  LatexTextSplitter,
  SupportedTextSplitterLanguages,
  // Extraction utilities
  extractText,
  extractTextWithMetadata,
  extractTextFromBuffer,
  isTextMimeType,
  isSupportedMimeType,
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
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
  // Preprocessing utilities (multi-format document cleanup)
  preprocessText,
  createPreprocessor,
  detectSourceFormat,
  isTabularContent,
  extractMetrics,
  extractFinancialMetrics,
  pdfPreprocessor,
  htmlPreprocessor,
  markdownPreprocessor,
  emailPreprocessor,
  codePreprocessor,
  textPreprocessor,
  // Types
  type ChunkOptions,
  type ChunkMetadata,
  type TextChunk,
  type ExtractionResult,
  type SupportedMimeType,
  type PDFExtractionOptions,
  type PreprocessorOptions,
  type SourceFormat,
} from '@rag/text-utils';
