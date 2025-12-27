// ============================================================================
// String Utilities
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate slug from string
 * Returns a slug that matches /^[a-z0-9-]+$/
 */
export function slugify(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    // Replace accented characters with their ASCII equivalents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove any characters that aren't lowercase letters, numbers, spaces, or hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace spaces and multiple hyphens with single hyphen
    .replace(/[\s_-]+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Ensure we have something valid - if empty, use a default
    || 'project';
}

// ============================================================================
// Format Utilities
// ============================================================================

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format date to locale string
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

/**
 * Format date with time
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString();
}

/**
 * Format duration in milliseconds to human-readable format
 * Examples: "1.2s", "45.3s", "2m 15s", "1h 5m"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '—';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  if (seconds > 0) {
    const remainingMs = ms % 1000;
    const decimal = Math.floor(remainingMs / 100);
    return decimal > 0 ? `${seconds}.${decimal}s` : `${seconds}s`;
  }
  
  return `${ms}ms`;
}

/**
 * Calculate processing duration from start and end timestamps
 * Returns null if either timestamp is missing
 */
export function calculateProcessingTime(
  startedAt?: string | Date | null,
  completedAt?: string | Date | null
): number | null {
  if (!startedAt || !completedAt) return null;
  
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const end = completedAt instanceof Date ? completedAt : new Date(completedAt);
  
  const diff = end.getTime() - start.getTime();
  return diff >= 0 ? diff : null;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug);
}

// ============================================================================
// Storage Utilities
// ============================================================================

const STORAGE_PREFIX = 'rag_';

/**
 * Get item from localStorage with prefix
 */
export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

/**
 * Set item to localStorage with prefix
 */
export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

/**
 * Remove item from localStorage
 */
export function removeStorageItem(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

/**
 * Clear all storage items with prefix
 */
export function clearStorage(): void {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Object Utilities
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

// ============================================================================
// ID Utilities
// ============================================================================

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Class Name Utilities
// ============================================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS support
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================================
// Chunk Display Utilities
// ============================================================================

/**
 * Remove overlapping content from consecutive chunks for display purposes.
 * 
 * When text is chunked with overlap for better search context, the same content
 * appears at the end of one chunk and the beginning of the next. This function
 * removes that overlap so each piece of content is shown only once.
 * 
 * @param chunks - Array of text chunks that may have overlapping content
 * @param minOverlapLength - Minimum overlap length to detect (default: 20)
 * @returns Array of chunks with overlap removed from subsequent chunks
 */
export function removeChunkOverlap(chunks: string[], minOverlapLength = 20): string[] {
  if (!chunks || chunks.length <= 1) return chunks;

  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1];
    const currentChunk = chunks[i];

    // Find the overlap by checking if the end of the previous chunk
    // matches the beginning of the current chunk
    // Use untrimmed comparison for consistency with slice operation
    let overlapLength = 0;
    const maxCheck = Math.min(prevChunk.length, currentChunk.length, 300);

    for (let len = maxCheck; len >= minOverlapLength; len--) {
      const prevEnd = prevChunk.slice(-len);
      const currentStart = currentChunk.slice(0, len);
      
      // Compare without trimming to maintain consistency with slice positions
      if (prevEnd === currentStart) {
        overlapLength = len;
        break;
      }
    }

    if (overlapLength > 0) {
      // Remove the overlapping portion from the beginning of the current chunk
      const remaining = currentChunk.slice(overlapLength);
      result.push(remaining.trimStart() || currentChunk); // Fallback to original if trimming leaves nothing
    } else {
      result.push(currentChunk);
    }
  }

  return result;
}
