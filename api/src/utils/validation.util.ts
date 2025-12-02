import path from 'path';
import { logger } from './logger';

/**
 * Input validation utility functions
 * These help prevent path traversal and other security issues
 */

/**
 * Validates that a file path is safe (no path traversal)
 */
export function validateFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  // Check for null bytes (security risk)
  if (filePath.includes('\0')) {
    logger.warn('Null byte detected in file path', { filePath });
    return false;
  }

  // Normalize the path and check for traversal attempts
  const normalized = path.normalize(filePath);
  
  // Check for path traversal patterns
  if (normalized.includes('..') || normalized.startsWith('/etc/') || normalized.startsWith('/root/')) {
    logger.warn('Path traversal attempt detected', { filePath, normalized });
    return false;
  }

  return true;
}

/**
 * Validates webhook URL format
 */
export function validateWebhookUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      logger.warn('Invalid webhook protocol', { url, protocol: parsed.protocol });
      return false;
    }

    // Prevent localhost/internal network calls in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      const internalPatterns = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '169.254.', // Link-local
        '10.', // Private network
        '172.16.', // Private network
        '192.168.', // Private network
      ];

      if (internalPatterns.some((pattern) => hostname.includes(pattern))) {
        logger.warn('Internal network webhook URL blocked', { url, hostname });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.warn('Invalid webhook URL format', { url, error });
    return false;
  }
}

/**
 * Validates webhook payload size (in bytes)
 */
export function validateWebhookPayloadSize(payload: unknown, maxSizeBytes = 1024 * 1024): boolean {
  try {
    const payloadString = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(payloadString, 'utf8');
    
    if (sizeBytes > maxSizeBytes) {
      logger.warn('Webhook payload exceeds size limit', {
        sizeBytes,
        maxSizeBytes,
        sizeMB: (sizeBytes / 1024 / 1024).toFixed(2),
      });
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating webhook payload size', { error });
    return false;
  }
}

/**
 * Sanitizes a file path by removing dangerous characters
 */
export function sanitizeFilePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = filePath.replace(/\0/g, '');
  
  // Normalize the path
  sanitized = path.normalize(sanitized);
  
  // Remove any remaining path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  
  return sanitized;
}

/**
 * Validates that a string is a valid company ID format
 */
export function validateCompanyId(companyId: string): boolean {
  if (!companyId || typeof companyId !== 'string') {
    return false;
  }

  // MongoDB ObjectId format (24 hex characters)
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  
  if (!objectIdPattern.test(companyId)) {
    logger.warn('Invalid company ID format', { companyId });
    return false;
  }

  return true;
}

/**
 * Validates that a string is a valid project ID format
 */
export function validateProjectId(projectId: string): boolean {
  if (!projectId || typeof projectId !== 'string') {
    return false;
  }

  // MongoDB ObjectId format (24 hex characters)
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  
  if (!objectIdPattern.test(projectId)) {
    logger.warn('Invalid project ID format', { projectId });
    return false;
  }

  return true;
}

/**
 * Validates a numeric value is within range
 */
export function validateNumberInRange(
  value: number,
  min: number,
  max: number,
  fieldName = 'value'
): boolean {
  if (typeof value !== 'number' || isNaN(value)) {
    logger.warn('Invalid number', { fieldName, value });
    return false;
  }

  if (value < min || value > max) {
    logger.warn('Number out of range', { fieldName, value, min, max });
    return false;
  }

  return true;
}

