import type { ChunkOptions, TextChunk } from './types';

/**
 * Default separators for recursive text splitting
 * Ordered from most semantic (paragraph) to least semantic (character)
 */
const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];

/**
 * Default chunk size in characters
 */
const DEFAULT_CHUNK_SIZE = 1000;

/**
 * Default overlap between chunks in characters
 */
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Minimum percentage of requested overlap to maintain
 */
const MIN_OVERLAP_RATIO = 0.8;

/**
 * Recursive Character Text Splitter
 *
 * Splits text attempting to keep paragraphs and sentences together.
 * This prevents context from being cut in half and maintains semantic integrity.
 * Ensures proper overlap between consecutive chunks.
 *
 * Inspired by LangChain's RecursiveCharacterTextSplitter.
 *
 * @param text - The text to split into chunks
 * @param options - Configuration options for chunking
 * @returns Array of text chunks
 *
 * @example
 * ```ts
 * const chunks = recursiveChunkText(longDocument, { chunkSize: 500, chunkOverlap: 50 });
 * ```
 */
export function recursiveChunkText(text: string, options: ChunkOptions = {}): string[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    separators = DEFAULT_SEPARATORS,
    trimChunks = true,
  } = options;

  // Handle edge cases
  if (!text || text.trim().length === 0) return [];
  if (text.length <= chunkSize) return [trimChunks ? text.trim() : text];

  const finalChunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;
  let overlapText = ''; // Track overlap text from previous chunk

  /**
   * Extract overlap from the end of a chunk, attempting to break at word boundaries
   */
  const extractOverlap = (chunkText: string): string => {
    if (chunkText.length <= chunkOverlap) {
      return chunkText;
    }

    // Start from the ideal position
    let overlapStart = chunkText.length - chunkOverlap;

    // Calculate minimum acceptable overlap
    const minOverlap = Math.floor(chunkOverlap * MIN_OVERLAP_RATIO);
    const maxSearchBack = chunkOverlap - minOverlap;

    // Search forward from the ideal start position to find a word boundary
    const searchWindow = Math.min(30, maxSearchBack);
    for (let i = overlapStart; i < chunkText.length && i < overlapStart + searchWindow; i++) {
      if (chunkText[i] === ' ' || chunkText[i] === '\n' || chunkText[i] === '\t') {
        overlapStart = i + 1;
        // Ensure we still have minimum overlap
        if (chunkText.length - overlapStart < minOverlap) {
          overlapStart = chunkText.length - chunkOverlap;
        }
        break;
      }
    }

    return chunkText.substring(overlapStart);
  };

  /**
   * Merge accumulated small pieces into valid chunks
   */
  const mergeCurrent = (): void => {
    if (currentChunk.length > 0) {
      const doc = currentChunk.join('');
      if (doc.trim().length > 0) {
        // Prepend overlap from previous chunk to current chunk
        const fullChunk = overlapText + doc;
        finalChunks.push(trimChunks ? fullChunk.trim() : fullChunk);

        // Extract overlap from the END of this chunk for the next chunk
        overlapText = extractOverlap(fullChunk);
      }

      // Reset for next chunk (but keep overlapText)
      currentChunk = [];
      currentLength = 0;
    }
  };

  /**
   * Recursive split function
   */
  const split = (textToSplit: string, separatorIndex: number): void => {
    if (separatorIndex >= separators.length) {
      // No more separators, force split by character if needed
      if (textToSplit.length > chunkSize) {
        // Force split the text into chunkSize pieces with overlap
        let startPos = 0;
        while (startPos < textToSplit.length) {
          const availableSize = chunkSize - overlapText.length;
          const endPos = Math.min(startPos + availableSize, textToSplit.length);
          const piece = textToSplit.substring(startPos, endPos);

          if (piece.length > 0) {
            if (currentLength + piece.length > availableSize) {
              mergeCurrent();
            }
            currentChunk.push(piece);
            currentLength += piece.length;
            if (currentLength >= availableSize) {
              mergeCurrent();
            }
          }

          // Move forward by chunkSize - overlap to ensure overlap
          startPos += chunkSize - chunkOverlap;
        }
      } else if (textToSplit.length > 0) {
        const availableSize = chunkSize - overlapText.length;
        if (currentLength + textToSplit.length > availableSize) {
          mergeCurrent();
        }
        currentChunk.push(textToSplit);
        currentLength += textToSplit.length;
      }
      return;
    }

    const separator = separators[separatorIndex];
    const splits = separator === '' ? [textToSplit] : textToSplit.split(separator);

    splits.forEach((s, i) => {
      // Restore separator unless it's the last element or separator is empty
      const segment = s + (separator !== '' && i < splits.length - 1 ? separator : '');

      if (segment.length === 0) return;

      if (segment.length > chunkSize) {
        // If this single segment is too big, recurse down to next separator
        split(segment, separatorIndex + 1);
      } else {
        // Account for overlap text when checking chunk size
        const availableSize = chunkSize - overlapText.length;
        if (currentLength + segment.length > availableSize) {
          mergeCurrent();
        }
        currentChunk.push(segment);
        currentLength += segment.length;
      }
    });
  };

  split(text, 0);
  mergeCurrent(); // Flush remainder

  return finalChunks;
}

/**
 * Chunk text into smaller pieces with metadata
 *
 * @param text - The text to split into chunks
 * @param options - Configuration options for chunking
 * @returns Array of text chunks with metadata
 *
 * @example
 * ```ts
 * const chunks = chunkTextWithMetadata(document);
 * chunks.forEach(chunk => {
 *   console.log(`Chunk ${chunk.metadata.index}: ${chunk.content.slice(0, 50)}...`);
 * });
 * ```
 */
export function chunkTextWithMetadata(text: string, options: ChunkOptions = {}): TextChunk[] {
  const chunks = recursiveChunkText(text, options);

  let currentPos = 0;
  return chunks.map((content, index) => {
    // Find the actual position of this chunk in the original text
    const startPos = text.indexOf(content.slice(0, 50), currentPos);
    const endPos = startPos + content.length;

    // Update current position for next search (accounting for overlap)
    currentPos = Math.max(currentPos, startPos + 1);

    return {
      content,
      metadata: {
        index,
        startPos: startPos >= 0 ? startPos : -1,
        endPos: startPos >= 0 ? endPos : -1,
        length: content.length,
      },
    };
  });
}

/**
 * Chunk text into smaller pieces for embedding
 *
 * @deprecated Use recursiveChunkText for better context preservation
 * @param text - The text to chunk
 * @param chunkSize - Maximum size of each chunk
 * @param overlap - Overlap between consecutive chunks
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
  return recursiveChunkText(text, { chunkSize, chunkOverlap: overlap });
}

/**
 * Estimate the number of chunks that will be created from text
 *
 * @param textLength - Length of the text in characters
 * @param chunkSize - Maximum size of each chunk
 * @param chunkOverlap - Overlap between chunks
 * @returns Estimated number of chunks
 */
export function estimateChunkCount(
  textLength: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  chunkOverlap: number = DEFAULT_CHUNK_OVERLAP
): number {
  if (textLength <= chunkSize) return 1;
  const effectiveChunkSize = chunkSize - chunkOverlap;
  return Math.ceil((textLength - chunkOverlap) / effectiveChunkSize);
}

/**
 * Split text by sentences
 *
 * @param text - The text to split
 * @returns Array of sentences
 */
export function splitBySentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  // Split by sentence-ending punctuation followed by space or end of string
  const sentences = text.split(/(?<=[.!?])\s+/);

  return sentences.filter((s) => s.trim().length > 0).map((s) => s.trim());
}

/**
 * Split text by paragraphs
 *
 * @param text - The text to split
 * @returns Array of paragraphs
 */
export function splitByParagraphs(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const paragraphs = text.split(/\n\s*\n/);

  return paragraphs.filter((p) => p.trim().length > 0).map((p) => p.trim());
}
