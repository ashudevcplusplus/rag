import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { projectRepository } from '../repositories/project.repository';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { sendNotFoundResponse, sendBadRequestResponse } from '../utils/response.util';
import { getCompanyId } from '../utils/request.util';
import { asyncHandler } from './error.middleware';
import { IProject } from '../schemas/project.schema';
import { IFileMetadata } from '../schemas/file-metadata.schema';

// Validation schemas
const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

const fileIdSchema = z.object({
  fileId: z.string().min(1),
});

/**
 * Extended request type with validated project and file
 */
export interface ValidatedFileRequest extends Request {
  validatedProject: IProject;
  validatedFile: IFileMetadata;
  validatedCompanyId: string;
}

/**
 * Middleware to validate file access within a project
 *
 * Validates:
 * - Company ID is present in the authenticated request
 * - Project exists and belongs to the authenticated company
 * - File exists and belongs to the project
 *
 * Attaches to request:
 * - validatedProject: The verified project
 * - validatedFile: The verified file
 * - validatedCompanyId: The company ID
 *
 * Use in routes that require project/file access validation:
 * ```typescript
 * router.get('/:projectId/files/:fileId', validateFileAccess, getFilePreview);
 * ```
 */
export const validateFileAccess = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const companyId = getCompanyId(req);
    if (!companyId) {
      sendBadRequestResponse(res, 'Company ID is required');
      return;
    }

    const { projectId } = projectIdSchema.parse(req.params);
    const { fileId } = fileIdSchema.parse(req.params);

    // Verify project exists
    const project = await projectRepository.findById(projectId);
    if (!project) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    // Verify project belongs to the authenticated company
    if (project.companyId !== companyId) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    // Verify file exists and belongs to project (with tenant isolation)
    const file = await fileMetadataRepository.findById(fileId, companyId);
    if (!file || file.projectId !== projectId) {
      sendNotFoundResponse(res, 'File');
      return;
    }

    // Attach validated entities to request
    const validatedReq = req as ValidatedFileRequest;
    validatedReq.validatedProject = project;
    validatedReq.validatedFile = file;
    validatedReq.validatedCompanyId = companyId;

    next();
  }
);

/**
 * Middleware to validate project access only (without file)
 *
 * Validates:
 * - Company ID is present in the authenticated request
 * - Project exists and belongs to the authenticated company
 */
export interface ValidatedProjectRequest extends Request {
  validatedProject: IProject;
  validatedCompanyId: string;
}

export const validateProjectAccess = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const companyId = getCompanyId(req);
    if (!companyId) {
      sendBadRequestResponse(res, 'Company ID is required');
      return;
    }

    const { projectId } = projectIdSchema.parse(req.params);

    // Verify project exists
    const project = await projectRepository.findById(projectId);
    if (!project) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    // Verify project belongs to the authenticated company
    if (project.companyId !== companyId) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    // Attach validated entities to request
    const validatedReq = req as ValidatedProjectRequest;
    validatedReq.validatedProject = project;
    validatedReq.validatedCompanyId = companyId;

    next();
  }
);
