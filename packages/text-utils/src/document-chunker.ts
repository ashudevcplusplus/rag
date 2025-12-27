/**
 * Document-Aware Chunking Module
 *
 * Simplified implementation using LangChain's built-in splitters.
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { ChunkOptions, TextChunk } from './types';

/**
 * Document type hints for optimized chunking
 */
export type DocumentType = 'financial' | 'general' | 'technical' | 'legal';

/**
 * Extended options for document-aware chunking
 */
export interface DocumentChunkOptions extends ChunkOptions {
  documentType?: DocumentType;
  preprocess?: boolean;
  pageBreakMarker?: string;
}

/**
 * Extended chunk metadata for documents
 */
export interface DocumentChunkMetadata {
  index: number;
  startPos: number;
  endPos: number;
  length: number;
  pageNumber?: number;
}

/**
 * Document chunk with extended metadata
 */
export interface DocumentChunk extends TextChunk {
  metadata?: DocumentChunkMetadata;
}

/**
 * Default settings by document type
 */
const DEFAULTS: Record<DocumentType, { size: number; overlap: number; separators: string[] }> = {
  financial: {
    size: 800,
    overlap: 150,
    separators: ['\n\n--- Page Break ---\n\n', '--- Page Break ---', '\n\n', '\n', '. ', ' ', ''],
  },
  general: {
    size: 1000,
    overlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  },
  technical: {
    size: 1200,
    overlap: 250,
    separators: ['\n\n', '\n', '```', '. ', ' ', ''],
  },
  legal: {
    size: 600,
    overlap: 100,
    separators: ['\n\n', '\n', '; ', '. ', ' ', ''],
  },
};

/**
 * Simple text preprocessing - removes common PDF artifacts
 */
function preprocess(text: string, pageBreakMarker: string): string {
  return (
    text
      // Remove standalone page numbers like "1/6", "Page 1"
      .replace(/^\s*(\d+\s*\/\s*\d+|page\s+\d+)\s*$/gim, '')
      // Remove repeated URLs on their own lines
      .replace(/^\s*https?:\/\/[^\s]+\s*$/gim, '')
      // Remove duplicate lines around page breaks (simple approach)
      .replace(new RegExp(`([^\\n]+)\\n+${pageBreakMarker}\\n+\\1`, 'g'), `$1\n\n${pageBreakMarker}`)
      // Collapse excessive newlines
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
  );
}

/**
 * Document-aware text chunking using LangChain
 *
 * @param text - The document text to chunk
 * @param options - Chunking configuration
 * @returns Array of text chunks
 */
export async function chunkDocument(text: string, options: DocumentChunkOptions = {}): Promise<string[]> {
  const {
    documentType = 'general',
    preprocess: doPreprocess = true,
    chunkSize,
    chunkOverlap,
    separators,
    trimChunks = true,
    pageBreakMarker = '--- Page Break ---',
  } = options;

  const defaults = DEFAULTS[documentType];
  const processedText = doPreprocess ? preprocess(text, pageBreakMarker) : text;

  if (!processedText || processedText.trim().length === 0) return [];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize ?? defaults.size,
    chunkOverlap: chunkOverlap ?? defaults.overlap,
    separators: separators ?? defaults.separators,
  });

  const chunks = await splitter.splitText(processedText);

  return trimChunks ? chunks.map((c) => c.trim()).filter((c) => c.length > 0) : chunks;
}

/**
 * Recursively split a long paragraph into chunks of the target size
 */
function splitLongParagraph(para: string, size: number): string[] {
  if (para.length <= size) return [para];

  const chunks: string[] = [];
  // Try splitting by sentences first
  const sentences = para.split(/(?<=[.!?])\s+/);

  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > size) {
      // Sentence is too long, split by words
      if (current) {
        chunks.push(current);
        current = '';
      }
      const words = sentence.split(/\s+/);
      for (const word of words) {
        if ((current + ' ' + word).length <= size) {
          current = current ? current + ' ' + word : word;
        } else {
          if (current) chunks.push(current);
          // If a single word is longer than size, split it
          if (word.length > size) {
            for (let i = 0; i < word.length; i += size) {
              chunks.push(word.slice(i, i + size));
            }
            current = '';
          } else {
            current = word;
          }
        }
      }
    } else if ((current + ' ' + sentence).length <= size) {
      current = current ? current + ' ' + sentence : sentence;
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

/**
 * Synchronous version using simple splitting
 */
export function chunkDocumentSync(text: string, options: DocumentChunkOptions = {}): string[] {
  const {
    documentType = 'general',
    preprocess: doPreprocess = true,
    chunkSize,
    chunkOverlap,
    trimChunks = true,
    pageBreakMarker = '--- Page Break ---',
  } = options;

  const defaults = DEFAULTS[documentType];
  const processedText = doPreprocess ? preprocess(text, pageBreakMarker) : text;
  const size = chunkSize ?? defaults.size;
  const overlap = chunkOverlap ?? defaults.overlap;

  if (!processedText || processedText.trim().length === 0) return [];
  if (processedText.length <= size) return [trimChunks ? processedText.trim() : processedText];

  // Simple chunking by paragraphs then sentences
  const chunks: string[] = [];
  const paragraphs = processedText.split(/\n\n+/);
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length <= size) {
      current = current ? current + '\n\n' + para : para;
    } else {
      if (current) chunks.push(current);
      // Recursively split long paragraphs instead of truncating
      if (para.length > size) {
        const splitChunks = splitLongParagraph(para, size);
        // Add all but the last chunk directly
        for (let i = 0; i < splitChunks.length - 1; i++) {
          chunks.push(splitChunks[i]);
        }
        // Keep the last chunk as current for potential merging
        current = splitChunks[splitChunks.length - 1] || '';
      } else {
        current = para;
      }
    }
  }
  if (current) chunks.push(current);

  // Add overlap by prepending end of previous chunk
  return chunks.map((chunk, i) => {
    if (i === 0 || overlap === 0) return trimChunks ? chunk.trim() : chunk;
    const prev = chunks[i - 1];
    const overlapText = prev.slice(-overlap);
    // Add space separator if overlap doesn't end with whitespace and chunk doesn't start with whitespace
    const needsSeparator = overlapText.length > 0 && !/\s$/.test(overlapText) && !/^\s/.test(chunk);
    const result = needsSeparator ? overlapText + ' ' + chunk : overlapText + chunk;
    return trimChunks ? result.trim() : result;
  });
}

/**
 * Document-aware chunking with metadata
 */
export async function chunkDocumentWithMetadata(
  text: string,
  options: DocumentChunkOptions = {}
): Promise<DocumentChunk[]> {
  const chunks = await chunkDocument(text, options);
  const pageBreakMarker = options.pageBreakMarker ?? '--- Page Break ---';

  let currentPos = 0;
  let pageNumber = 1;

  return chunks.map((content, index) => {
    const startPos = text.indexOf(content.slice(0, 50), currentPos);
    currentPos = Math.max(currentPos, startPos + 1);

    // Count page breaks before this position
    const textBefore = text.slice(0, startPos);
    pageNumber = (textBefore.match(new RegExp(pageBreakMarker, 'g')) || []).length + 1;

    return {
      content,
      metadata: {
        index,
        startPos: startPos >= 0 ? startPos : -1,
        endPos: startPos >= 0 ? startPos + content.length : -1,
        length: content.length,
        pageNumber,
      },
    };
  });
}
