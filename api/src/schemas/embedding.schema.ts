import { z } from 'zod';

// TypeScript Interface
export interface IEmbedding {
  _id: string;
  fileId: string;
  projectId: string;
  
  // Chunk Info
  chunkIndex: number;
  content: string;
  vector: number[];
  
  // Metadata
  metadata?: {
    startIndex?: number;
    endIndex?: number;
    tokens?: number;
    [key: string]: unknown;
  };

  // Timestamps
  createdAt: Date; // TTL index
}

// Zod Validation Schemas
export const createEmbeddingSchema = z.object({
  fileId: z.string().min(1),
  projectId: z.string().min(1),
  chunkIndex: z.number().int().min(0),
  content: z.string().min(1),
  vector: z.array(z.number()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateEmbeddingDTO = z.infer<typeof createEmbeddingSchema>;

