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
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.object({
    mimetype: z.enum(
      ['application/pdf', 'text/plain', 'application/json', 'text/markdown', 'text/csv'],
      { message: 'Unsupported file type' }
    ),
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
});

// Job ID validation
export const jobIdSchema = z.object({
  jobId: z.string().min(1, { message: 'Job ID is required' }),
});
