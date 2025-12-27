import { z } from 'zod';

// Company ID validation
export const companyIdSchema = z.object({
  companyId: z
    .string()
    .min(1, { message: 'Company ID is required' })
    .max(100, { message: 'Company ID too long' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid company ID format' }),
});

// Project ID validation
export const projectIdBodySchema = z.object({
  projectId: z
    .string()
    .min(1, { message: 'Project ID is required' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid project ID format' }),
  embeddingProvider: z
    .enum(['inhouse', 'openai', 'gemini'], { message: 'Invalid embedding provider' })
    .optional(),
  embeddingModel: z.string().optional(),
});

// Allowed document MIME types (must match upload.middleware.ts)
const ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',
  // Plain text
  'text/plain',
  // Microsoft Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Rich Text Format
  'application/rtf',
  'text/rtf',
  // OpenDocument Text
  'application/vnd.oasis.opendocument.text',
  // Markdown
  'text/markdown',
  'text/x-markdown',
  // CSV
  'text/csv',
  // XML
  'application/xml',
  'text/xml',
  // JSON
  'application/json',
  // HTML
  'text/html',
  // Email
  'message/rfc822',
  'application/vnd.ms-outlook',
  // Code
  'text/javascript',
  'application/javascript',
  'text/typescript',
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-go',
] as const;

// File upload validation
export const fileUploadSchema = z.object({
  file: z.object({
    mimetype: z.enum(ALLOWED_MIME_TYPES, {
      message:
        'Unsupported file type. Only document files (PDF, TXT, DOCX, DOC, RTF, ODT, MD, CSV, XML, JSON, HTML, EML, CODE) are allowed.',
    }),
    size: z.number().max(50 * 1024 * 1024, { message: 'File too large (Max 50MB)' }),
    originalname: z.string(),
  }),
});

// Search query validation
export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, { message: 'Query cannot be empty' })
    .max(1000, { message: 'Query too long (Max 1000 characters)' }),
  limit: z.number().int().min(1).max(100).optional().default(10),
  filter: z.record(z.string(), z.unknown()).optional(),
  rerank: z.boolean().optional().default(false),
  embeddingProvider: z
    .enum(['inhouse', 'openai', 'gemini'], { message: 'Invalid embedding provider' })
    .optional(),
});

// Job ID validation
export const jobIdSchema = z.object({
  jobId: z.string().min(1, { message: 'Job ID is required' }),
});
