import { z } from 'zod';

// Enums
export enum SubscriptionTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELLED = 'CANCELLED',
}

// TypeScript Interface
export interface ICompany {
  _id: string;
  name: string;
  slug: string;
  email: string;

  // Subscription & Limits
  subscriptionTier: SubscriptionTier;
  storageLimit: number;
  storageUsed: number;
  maxUsers: number;
  maxProjects: number;

  // API Access
  apiKey: string;
  apiKeyHash: string;
  apiKeyLastUsed?: Date;

  // Status & Settings
  status: CompanyStatus;
  settings?: {
    notifications?: {
      email?: boolean;
      slack?: boolean;
    };
    features?: {
      advancedSearch?: boolean;
      apiAccess?: boolean;
    };
    [key: string]: unknown;
  };

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Zod Validation Schemas
// Settings subschema
export const companySettingsSchema = z
  .object({
    notifications: z
      .object({
        email: z.boolean().optional(),
        slack: z.boolean().optional(),
      })
      .optional(),
    features: z
      .object({
        advancedSearch: z.boolean().optional(),
        apiAccess: z.boolean().optional(),
      })
      .optional(),
  })
  .passthrough()
  .optional();

export const createCompanySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),
  email: z.string().email().toLowerCase().trim(),
  subscriptionTier: z.nativeEnum(SubscriptionTier).optional().default(SubscriptionTier.FREE),
  storageLimit: z.number().int().positive().optional().default(5368709120), // 5GB
  maxUsers: z.number().int().positive().optional().default(5),
  maxProjects: z.number().int().positive().optional().default(10),
  settings: companySettingsSchema,
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  subscriptionTier: z.nativeEnum(SubscriptionTier).optional(),
  storageLimit: z.number().int().positive().optional(),
  maxUsers: z.number().int().positive().optional(),
  maxProjects: z.number().int().positive().optional(),
  status: z.nativeEnum(CompanyStatus).optional(),
  settings: companySettingsSchema,
});

export const companyIdSchema = z.object({
  companyId: z.string().min(1),
});

// Type exports
export type CreateCompanyDTO = z.infer<typeof createCompanySchema>;
export type UpdateCompanyDTO = z.infer<typeof updateCompanySchema>;
