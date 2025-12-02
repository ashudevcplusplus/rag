import { z } from 'zod';

// Enums
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  TEAM = 'TEAM',
  COMPANY = 'COMPANY',
}

// TypeScript Interface
export interface IProject {
  _id: string;
  companyId: string;
  ownerId: string;

  // Project Info
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;

  // Organization
  tags: string[];
  status: ProjectStatus;
  visibility: Visibility;

  // Storage & Stats
  fileCount: number;
  totalSize: number;
  vectorCount: number;

  // Settings
  settings?: {
    autoIndex?: boolean;
    chunkSize?: number;
    chunkOverlap?: number;
    [key: string]: unknown;
  };
  metadata?: {
    department?: string;
    category?: string;
    customFields?: Record<string, string | number | boolean>;
    [key: string]: unknown;
  };

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  archivedAt?: Date;
}

// Settings subschema
export const projectSettingsSchema = z
  .object({
    autoIndex: z.boolean().optional(),
    chunkSize: z.number().int().positive().optional(),
    chunkOverlap: z.number().int().min(0).optional(),
  })
  .passthrough()
  .optional();

// Metadata subschema
export const projectMetadataSchema = z
  .object({
    department: z.string().optional(),
    category: z.string().optional(),
    customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .passthrough()
  .optional();

// Zod Validation Schemas
export const createProjectSchema = z.object({
  companyId: z.string().min(1),
  ownerId: z.string().min(1).optional(), // Optional - will default to companyId if not provided
  name: z.string().min(1).max(100).trim(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),
  description: z.string().max(500).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
  icon: z.string().max(50).optional(),
  tags: z.array(z.string().trim()).optional().default([]),
  visibility: z.nativeEnum(Visibility).optional().default(Visibility.PRIVATE),
  settings: projectSettingsSchema,
  metadata: projectMetadataSchema,
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
  tags: z.array(z.string().trim()).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  settings: projectSettingsSchema,
  metadata: projectMetadataSchema,
});

export const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

// Type exports
export type CreateProjectDTO = z.infer<typeof createProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof updateProjectSchema>;
