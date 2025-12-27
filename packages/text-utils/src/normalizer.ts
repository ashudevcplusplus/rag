/**
 * Text normalization and processing utilities
 */

/**
 * Normalize whitespace in text
 * - Collapses multiple spaces into single space
 * - Trims leading and trailing whitespace
 * - Normalizes line endings to \n
 *
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return '';

  return (
    text
      // Normalize line endings to \n
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Collapse multiple spaces (but not newlines) into single space
      .replace(/[ \t]+/g, ' ')
      // Collapse multiple newlines into double newline (paragraph break)
      .replace(/\n{3,}/g, '\n\n')
      // Trim each line
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      // Final trim
      .trim()
  );
}

/**
 * Remove all extra whitespace, collapsing to single spaces
 *
 * @param text - Text to clean
 * @returns Text with minimal whitespace
 */
export function collapseWhitespace(text: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Count words in text
 *
 * @param text - Text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Count sentences in text
 *
 * @param text - Text to count sentences in
 * @returns Number of sentences
 */
export function countSentences(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  // Count sentence-ending punctuation
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

/**
 * Count paragraphs in text
 *
 * @param text - Text to count paragraphs in
 * @returns Number of paragraphs
 */
export function countParagraphs(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return paragraphs.length;
}

/**
 * Estimate reading time in minutes
 *
 * @param text - Text to estimate reading time for
 * @param wordsPerMinute - Reading speed (default: 200 WPM)
 * @returns Estimated reading time in minutes
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @param ellipsis - Ellipsis string (default: '...')
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - ellipsis.length).trim() + ellipsis;
}

/**
 * Truncate text at word boundary
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @param ellipsis - Ellipsis string (default: '...')
 * @returns Truncated text at word boundary
 */
export function truncateAtWord(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (!text || text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength - ellipsis.length);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.5) {
    return truncated.substring(0, lastSpace).trim() + ellipsis;
  }

  return truncated.trim() + ellipsis;
}

/**
 * Remove common stop words from text (English)
 *
 * @param text - Text to process
 * @returns Text with stop words removed
 */
export function removeStopWords(text: string): string {
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'or',
    'that',
    'the',
    'to',
    'was',
    'were',
    'will',
    'with',
  ]);

  return text
    .split(/\s+/)
    .filter((word) => !stopWords.has(word.toLowerCase()))
    .join(' ');
}

/**
 * Extract keywords from text (simple implementation)
 * Returns unique words sorted by frequency
 *
 * @param text - Text to extract keywords from
 * @param limit - Maximum number of keywords to return
 * @returns Array of keywords sorted by frequency
 */
export function extractKeywords(text: string, limit: number = 10): string[] {
  if (!text || text.trim().length === 0) return [];

  // Remove punctuation and convert to lowercase
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');

  // Count word frequencies
  const wordCounts = new Map<string, number>();
  const words = cleanText.split(/\s+/).filter((w) => w.length > 2);

  // Common stop words to exclude
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'have',
    'he',
    'her',
    'his',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'or',
    'she',
    'that',
    'the',
    'their',
    'them',
    'they',
    'this',
    'to',
    'was',
    'were',
    'will',
    'with',
    'you',
    'your',
  ]);

  for (const word of words) {
    if (!stopWords.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  // Sort by frequency and return top keywords
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Generate a text preview/summary (first N characters)
 *
 * @param text - Text to preview
 * @param length - Preview length (default: 200)
 * @returns Text preview
 */
export function getTextPreview(text: string, length: number = 200): string {
  if (!text) return '';
  const normalized = collapseWhitespace(text);
  return truncateAtWord(normalized, length);
}

/**
 * Check if text is mostly ASCII
 *
 * @param text - Text to check
 * @param threshold - Minimum percentage of ASCII characters (default: 0.9)
 * @returns True if text is mostly ASCII
 */
export function isMostlyAscii(text: string, threshold: number = 0.9): boolean {
  if (!text) return true;

  let asciiCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) <= 127) {
      asciiCount++;
    }
  }

  return asciiCount / text.length >= threshold;
}

/**
 * Generate a content hash for deduplication
 *
 * @param text - Text to hash
 * @returns Simple hash string
 */
export function generateContentHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
