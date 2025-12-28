import { z } from 'zod';
import { ProcessingStatus, UploadStatus } from '@rag/types';

// TypeScript Interface
export interface IFileMetadata {
  _id: string;
  projectId: string;
  uploadedBy: string;

  // File Info
  filename: string;
  originalFilename: string;
  filepath: string;
  mimetype: string;
  size: number;
  hash: string;

  // Processing Status
  uploadStatus: UploadStatus;
  processingStatus: ProcessingStatus;
  indexingJobId?: string;

  // Processing Results
  textExtracted: boolean;
  textLength?: number;
  chunkCount?: number;
  vectorIndexed: boolean;
  vectorCollection?: string;

  // Timestamps
  uploadedAt: Date;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  vectorIndexedAt?: Date;
  lastAccessedAt?: Date;

  // Error Handling
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: Date;

  // Embedding Configuration (stored for reindexing consistency)
  embeddingProvider?: 'openai' | 'gemini';
  embeddingModel?: string;

  // Metadata
  metadata?: {
    author?: string;
    title?: string;
    description?: string;
    source?: string;
    customFields?: Record<string, string | number | boolean>;
    [key: string]: unknown;
  };
  tags: string[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Metadata subschema
export const fileMetadataDetailsSchema = z
  .object({
    author: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    source: z.string().optional(),
    customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .passthrough()
  .optional();

// Zod Validation Schemas
export const createFileMetadataSchema = z.object({
  projectId: z.string().min(1),
  uploadedBy: z.string().min(1),
  filename: z.string().min(1).max(255),
  originalFilename: z.string().min(1).max(255),
  filepath: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().int().positive(),
  hash: z.string().min(1),
  indexingJobId: z.string().optional(),
  tags: z.array(z.string().trim()).optional().default([]),
  metadata: fileMetadataDetailsSchema,
  embeddingProvider: z.enum(['openai', 'gemini']).optional(),
  embeddingModel: z.string().optional(),
});

export const updateFileMetadataSchema = z.object({
  uploadStatus: z.nativeEnum(UploadStatus).optional(),
  processingStatus: z.nativeEnum(ProcessingStatus).optional(),
  indexingJobId: z.string().optional(),
  textExtracted: z.boolean().optional(),
  textLength: z.number().int().optional(),
  chunkCount: z.number().int().optional(),
  vectorIndexed: z.boolean().optional(),
  vectorCollection: z.string().optional(),
  processingStartedAt: z.date().optional(),
  processingCompletedAt: z.date().optional(),
  vectorIndexedAt: z.date().optional(),
  lastAccessedAt: z.date().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().optional(),
  lastRetryAt: z.date().optional(),
  tags: z.array(z.string().trim()).optional(),
  metadata: fileMetadataDetailsSchema,
});

export const fileIdSchema = z.object({
  fileId: z.string().min(1),
});

// Type exports
export type CreateFileMetadataDTO = z.infer<typeof createFileMetadataSchema>;
export type UpdateFileMetadataDTO = z.infer<typeof updateFileMetadataSchema>;
