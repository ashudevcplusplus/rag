import { z } from 'zod';

// Enums
export enum ProjectRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// TypeScript Interface
export interface IProjectMember {
  _id: string;
  projectId: string;
  userId: string;

  role: ProjectRole;
  permissions?: {
    canEdit?: boolean;
    canDelete?: boolean;
    canInvite?: boolean;
    [key: string]: unknown;
  };

  addedAt: Date;
  addedBy?: string;
}

// Permissions subschema
export const projectMemberPermissionsSchema = z
  .object({
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canInvite: z.boolean().optional(),
  })
  .passthrough()
  .optional();

// Zod Validation Schemas
export const addProjectMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: z.nativeEnum(ProjectRole).optional().default(ProjectRole.VIEWER),
  permissions: projectMemberPermissionsSchema,
  addedBy: z.string().min(1).optional(),
});

export const updateProjectMemberSchema = z.object({
  role: z.nativeEnum(ProjectRole).optional(),
  permissions: projectMemberPermissionsSchema,
});

export const projectMemberIdSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

// Type exports
export type AddProjectMemberDTO = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberDTO = z.infer<typeof updateProjectMemberSchema>;
