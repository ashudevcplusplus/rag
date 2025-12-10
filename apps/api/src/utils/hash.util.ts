import crypto from 'crypto';

/**
 * Generate SHA-256 hash from buffer or string
 */
export function generateHash(
  data: Buffer | string,
  algorithm: 'sha256' | 'md5' = 'sha256'
): string {
  if (Buffer.isBuffer(data)) {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }
  return crypto.createHash(algorithm).update(data, 'utf8').digest('hex');
}

/**
 * Generate file hash for deduplication (SHA-256)
 */
export function generateFileHash(fileBuffer: Buffer): string {
  return generateHash(fileBuffer, 'sha256');
}

/**
 * Generate content hash for deterministic IDs (SHA-256)
 */
export function generateContentHash(content: string): string {
  return generateHash(content, 'sha256');
}

/**
 * Generate deterministic point ID (MD5 for faster hashing)
 */
export function generatePointId(
  companyId: string,
  fileId: string,
  contentHash: string,
  index: number
): string {
  const combined = `${companyId}:${fileId}:${contentHash}:${index}`;
  return generateHash(combined, 'md5');
}
