import {
  RecursiveCharacterTextSplitter,
  CharacterTextSplitter,
  TokenTextSplitter,
  MarkdownTextSplitter,
  LatexTextSplitter,
  SupportedTextSplitterLanguages,
} from '@langchain/textsplitters';
import type { ChunkOptions, TextChunk } from './types';

// Re-export LangChain splitters for direct access
export {
  RecursiveCharacterTextSplitter,
  CharacterTextSplitter,
  TokenTextSplitter,
  MarkdownTextSplitter,
  LatexTextSplitter,
  SupportedTextSplitterLanguages,
} from '@langchain/textsplitters';

/**
 * Default chunk size in characters
 */
const DEFAULT_CHUNK_SIZE = 1000;

/**
 * Default overlap between chunks in characters
 */
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Recursive Character Text Splitter using LangChain
 *
 * Splits text attempting to keep paragraphs and sentences together.
 * This prevents context from being cut in half and maintains semantic integrity.
 * Ensures proper overlap between consecutive chunks.
 *
 * Uses LangChain's RecursiveCharacterTextSplitter under the hood.
 *
 * @param text - The text to split into chunks
 * @param options - Configuration options for chunking
 * @returns Array of text chunks
 *
 * @example
 * ```ts
 * const chunks = await recursiveChunkText(longDocument, { chunkSize: 500, chunkOverlap: 50 });
 * ```
 */
export async function recursiveChunkText(
  text: string,
  options: ChunkOptions = {}
): Promise<string[]> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    separators,
    trimChunks = true,
  } = options;

  // Handle edge cases
  if (!text || text.trim().length === 0) return [];
  if (text.length <= chunkSize) return [trimChunks ? text.trim() : text];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: separators || ['\n\n', '\n', '. ', ' ', ''],
  });

  const chunks = await splitter.splitText(text);

  if (trimChunks) {
    return chunks.map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0);
  }

  return chunks;
}

/**
 * Synchronous version of recursiveChunkText for backwards compatibility
 *
 * @deprecated Use the async version `recursiveChunkText` for better performance
 */
export function recursiveChunkTextSync(text: string, options: ChunkOptions = {}): string[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    separators,
    trimChunks = true,
  } = options;

  // Handle edge cases
  if (!text || text.trim().length === 0) return [];
  if (text.length <= chunkSize) return [trimChunks ? text.trim() : text];

  // Fallback to simple implementation for sync operation
  const seps = separators || ['\n\n', '\n', '. ', ' ', ''];
  const finalChunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;
  let overlapText = '';

  const extractOverlap = (chunkText: string): string => {
    if (chunkText.length <= chunkOverlap) {
      return chunkText;
    }
    let overlapStart = chunkText.length - chunkOverlap;
    const minOverlap = Math.floor(chunkOverlap * 0.8);
    const searchWindow = Math.min(30, chunkOverlap - minOverlap);
    for (let i = overlapStart; i < chunkText.length && i < overlapStart + searchWindow; i++) {
      if (chunkText[i] === ' ' || chunkText[i] === '\n' || chunkText[i] === '\t') {
        overlapStart = i + 1;
        if (chunkText.length - overlapStart < minOverlap) {
          overlapStart = chunkText.length - chunkOverlap;
        }
        break;
      }
    }
    return chunkText.substring(overlapStart);
  };

  const mergeCurrent = (): void => {
    if (currentChunk.length > 0) {
      const doc = currentChunk.join('');
      if (doc.trim().length > 0) {
        const fullChunk = overlapText + doc;
        finalChunks.push(trimChunks ? fullChunk.trim() : fullChunk);
        overlapText = extractOverlap(fullChunk);
      }
      currentChunk = [];
      currentLength = 0;
    }
  };

  const split = (textToSplit: string, separatorIndex: number): void => {
    if (separatorIndex >= seps.length) {
      if (textToSplit.length > chunkSize) {
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

    const separator = seps[separatorIndex];
    const splits = separator === '' ? [textToSplit] : textToSplit.split(separator);

    splits.forEach((s, i) => {
      const segment = s + (separator !== '' && i < splits.length - 1 ? separator : '');
      if (segment.length === 0) return;
      if (segment.length > chunkSize) {
        split(segment, separatorIndex + 1);
      } else {
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
  mergeCurrent();

  return finalChunks;
}

/**
 * Chunk text using LangChain's CharacterTextSplitter
 * Splits on a single character/separator
 *
 * @param text - The text to split
 * @param options - Chunking options
 * @param separator - The separator to split on (default: '\n\n')
 * @returns Array of text chunks
 */
export async function chunkByCharacter(
  text: string,
  options: ChunkOptions = {},
  separator: string = '\n\n'
): Promise<string[]> {
  const { chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP } = options;

  if (!text || text.trim().length === 0) return [];

  const splitter = new CharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separator,
  });

  return splitter.splitText(text);
}

/**
 * Chunk text by tokens using LangChain's TokenTextSplitter
 * Better for LLM context windows as it counts tokens, not characters
 *
 * @param text - The text to split
 * @param options - Chunking options (chunkSize is in tokens)
 * @returns Array of text chunks
 */
export async function chunkByTokens(
  text: string,
  options: { chunkSize?: number; chunkOverlap?: number } = {}
): Promise<string[]> {
  const { chunkSize = 500, chunkOverlap = 50 } = options;

  if (!text || text.trim().length === 0) return [];

  const splitter = new TokenTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  return splitter.splitText(text);
}

/**
 * Chunk Markdown text using LangChain's MarkdownTextSplitter
 * Aware of Markdown structure (headers, code blocks, etc.)
 *
 * @param text - The Markdown text to split
 * @param options - Chunking options
 * @returns Array of text chunks
 */
export async function chunkMarkdown(text: string, options: ChunkOptions = {}): Promise<string[]> {
  const { chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP } = options;

  if (!text || text.trim().length === 0) return [];

  const splitter = new MarkdownTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  return splitter.splitText(text);
}

/**
 * Chunk LaTeX text using LangChain's LatexTextSplitter
 *
 * @param text - The LaTeX text to split
 * @param options - Chunking options
 * @returns Array of text chunks
 */
export async function chunkLatex(text: string, options: ChunkOptions = {}): Promise<string[]> {
  const { chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP } = options;

  if (!text || text.trim().length === 0) return [];

  const splitter = new LatexTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  return splitter.splitText(text);
}

/**
 * Chunk code using LangChain's RecursiveCharacterTextSplitter with language support
 *
 * @param text - The code to split
 * @param language - The programming language
 * @param options - Chunking options
 * @returns Array of code chunks
 */
export async function chunkCode(
  text: string,
  language: (typeof SupportedTextSplitterLanguages)[number],
  options: ChunkOptions = {}
): Promise<string[]> {
  const { chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP } = options;

  if (!text || text.trim().length === 0) return [];

  const splitter = RecursiveCharacterTextSplitter.fromLanguage(language, {
    chunkSize,
    chunkOverlap,
  });

  return splitter.splitText(text);
}

/**
 * Chunk text with metadata using LangChain
 *
 * @param text - The text to split into chunks
 * @param options - Configuration options for chunking
 * @returns Array of text chunks with metadata
 */
export async function chunkTextWithMetadata(
  text: string,
  options: ChunkOptions = {}
): Promise<TextChunk[]> {
  const chunks = await recursiveChunkText(text, options);

  let currentPos = 0;
  return chunks.map((content, index) => {
    const startPos = text.indexOf(content.slice(0, 50), currentPos);
    const endPos = startPos + content.length;
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
 * Backwards compatible wrapper using synchronous implementation
 *
 * @deprecated Use recursiveChunkText (async) for better results with LangChain
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
  return recursiveChunkTextSync(text, { chunkSize, chunkOverlap: overlap });
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

/**
 * Create a custom LangChain text splitter with specific configuration
 *
 * @param options - Splitter configuration
 * @returns Configured RecursiveCharacterTextSplitter instance
 */
export function createTextSplitter(options: {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
    chunkOverlap: options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
    separators: options.separators ?? ['\n\n', '\n', '. ', ' ', ''],
  });
}
