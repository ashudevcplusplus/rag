import { z } from 'zod';

// TypeScript Interface
export interface IEmbedding {
  _id: string;
  fileId: string;
  projectId: string;

  // Chunks Info
  chunkCount: number;
  contents: string[];
  vectors: number[][];

  // Embedding Provider Info
  provider: 'openai' | 'gemini';
  modelName: string;
  vectorDimensions: number;

  // Metadata
  metadata?: {
    [key: string]: unknown;
  };

  // Timestamps
  createdAt: Date; // TTL index
  deletedAt?: Date;
}

// Zod Validation Schemas
export const createEmbeddingSchema = z.object({
  fileId: z.string().min(1),
  projectId: z.string().min(1),
  chunkCount: z.number().int().min(0),
  contents: z.array(z.string()),
  vectors: z.array(z.array(z.number())),
  provider: z.enum(['openai', 'gemini']),
  modelName: z.string().min(1),
  vectorDimensions: z.number().int().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateEmbeddingDTO = z.infer<typeof createEmbeddingSchema>;
