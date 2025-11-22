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

  // Helper to merge accumulated small pieces into valid chunks
  const mergeCurrent = (): void => {
    if (currentChunk.length > 0) {
      const doc = currentChunk.join('');
      if (doc.trim().length > 0) {
        finalChunks.push(doc.trim());
      }

      // Handle overlap: keep the tail end of this chunk for the next one
      const overlapBuffer: string[] = [];
      let overlapLength = 0;

      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const piece = currentChunk[i];
        if (overlapLength + piece.length > chunkOverlap) break;
        overlapBuffer.unshift(piece);
        overlapLength += piece.length;
      }
      currentChunk = overlapBuffer;
      currentLength = overlapLength;
    }
  };

  // Recursive split function
  const split = (text: string, separatorIndex: number): void => {
    if (separatorIndex >= separators.length) {
      // No more separators, force add what we have
      if (text.length > 0) {
        if (currentLength + text.length > chunkSize) mergeCurrent();
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
        if (currentLength + segment.length > chunkSize) {
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
