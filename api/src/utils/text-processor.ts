import fs from 'fs';
import pdf from 'pdf-parse';

/**
 * Extract text from various file types
 */
export async function extractText(filePath: string, mimetype: string): Promise<string> {
  // Handle text-based files directly
  if (mimetype.startsWith('text/') || mimetype === 'application/json') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  // Handle PDF files
  if (mimetype === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  // For other types, try reading as text
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`Unsupported file type: ${mimetype}`);
  }
}

/**
 * Recursive Character Text Splitter
 * Splits text attempting to keep paragraphs and sentences together.
 * This prevents context from being cut in half and maintains semantic integrity.
 * Ensures proper overlap between consecutive chunks.
 */
export function recursiveChunkText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= chunkSize) return [text.trim()];

  const separators = ['\n\n', '\n', '. ', ' ', ''];
  const finalChunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;
  let overlapText = ''; // Track overlap text from previous chunk

  // Helper to extract overlap from the end of a chunk
  const extractOverlap = (chunkText: string): string => {
    if (chunkText.length <= chunkOverlap) {
      return chunkText;
    }
    
    // Extract last chunkOverlap characters, trying to break at word boundaries
    // Start from the ideal position
    let overlapStart = chunkText.length - chunkOverlap;
    
    // Try to find a good break point (space, newline, etc.) but don't go too far back
    // We want to preserve at least 80% of the requested overlap
    const minOverlap = Math.floor(chunkOverlap * 0.8);
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

  // Helper to merge accumulated small pieces into valid chunks
  const mergeCurrent = (): void => {
    if (currentChunk.length > 0) {
      const doc = currentChunk.join('');
      if (doc.trim().length > 0) {
        // Prepend overlap from previous chunk to current chunk
        const fullChunk = overlapText + doc;
        finalChunks.push(fullChunk.trim());
        
        // Extract overlap from the END of this chunk for the next chunk
        overlapText = extractOverlap(fullChunk);
      }

      // Reset for next chunk (but keep overlapText)
      currentChunk = [];
      currentLength = 0;
    }
  };

  // Recursive split function
  const split = (text: string, separatorIndex: number): void => {
    if (separatorIndex >= separators.length) {
      // No more separators, force split by character if needed
      if (text.length > chunkSize) {
        // Force split the text into chunkSize pieces with overlap
        let startPos = 0;
        while (startPos < text.length) {
          const availableSize = chunkSize - overlapText.length;
          const endPos = Math.min(startPos + availableSize, text.length);
          const piece = text.substring(startPos, endPos);
          
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
      } else if (text.length > 0) {
        const availableSize = chunkSize - overlapText.length;
        if (currentLength + text.length > availableSize) {
          mergeCurrent();
        }
        currentChunk.push(text);
        currentLength += text.length;
      }
      return;
    }

    const separator = separators[separatorIndex];
    const splits = separator === '' ? [text] : text.split(separator);

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
 * Chunk text into smaller pieces for embedding
 * Fixed version with proper overlap handling
 * @deprecated Use recursiveChunkText for better context preservation
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  // Use the new recursive chunker by default
  return recursiveChunkText(text, chunkSize, overlap);
}
