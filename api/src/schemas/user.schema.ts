import { z } from 'zod';

// Enums
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

// TypeScript Interface
export interface IUser {
  _id: string;
  companyId: string;

  // Authentication
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;

  // Profile
  firstName: string;
  lastName: string;
  fullName?: string; // virtual field
  avatarUrl?: string;
  phoneNumber?: string;

  // Access Control
  role: UserRole;
  permissions?: {
    canUpload?: boolean;
    canDelete?: boolean;
    canShare?: boolean;
    canManageUsers?: boolean;
    [key: string]: unknown;
  };
  isActive: boolean;

  // Session & Security
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Permissions subschema
export const userPermissionsSchema = z
  .object({
    canUpload: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canShare: z.boolean().optional(),
    canManageUsers: z.boolean().optional(),
  })
  .passthrough()
  .optional();

// Zod Validation Schemas
export const createUserSchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  avatarUrl: z.string().url().optional(),
  phoneNumber: z.string().optional(),
  role: z.nativeEnum(UserRole).optional().default(UserRole.MEMBER),
  permissions: userPermissionsSchema,
});

export const updateUserSchema = z.object({
  email: z.string().email().toLowerCase().trim().optional(),
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  avatarUrl: z.string().url().optional(),
  phoneNumber: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  permissions: userPermissionsSchema,
  isActive: z.boolean().optional(),
});

export const userIdSchema = z.object({
  userId: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

// Type exports
export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
