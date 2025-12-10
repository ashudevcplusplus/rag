import { z } from 'zod';

// TypeScript Interface
export interface IApiLog {
  _id: string;
  companyId: string;

  // Request Info
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number; // milliseconds

  // Usage Tracking
  ipAddress: string;
  userAgent?: string;
  apiKey?: string;

  // Metadata
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;

  timestamp: Date;
}

// Zod Validation Schemas
export const createApiLogSchema = z.object({
  companyId: z.string().min(1),
  method: z.string().min(1).max(10),
  endpoint: z.string().min(1).max(500),
  statusCode: z.number().int().min(100).max(599),
  responseTime: z.number().int().min(0),
  ipAddress: z.string().min(1),
  userAgent: z.string().optional(),
  apiKey: z.string().optional(),
  requestSize: z.number().int().optional(),
  responseSize: z.number().int().optional(),
  errorMessage: z.string().optional(),
});

// Type exports
export type CreateApiLogDTO = z.infer<typeof createApiLogSchema>;
