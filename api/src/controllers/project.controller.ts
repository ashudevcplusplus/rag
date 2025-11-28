import { Request, Response } from 'express';
import { projectRepository } from '../repositories/project.repository';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
} from '../schemas/project.schema';
import { logger } from '../utils/logger';
import {
  handleControllerError,
  sendConflictResponse,
  sendNotFoundResponse,
  sendBadRequestResponse,
} from '../utils/response.util';
import { getCompanyId } from '../utils/request.util';
import { parsePaginationQuery, createPaginationResponse } from '../utils/pagination.util';

/**
 * Create a new project
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      sendBadRequestResponse(res, 'Company ID required');
      return;
    }

    const data = createProjectSchema.parse({ ...req.body, companyId });

    // Check if slug already exists within this company
    const existing = await projectRepository.findBySlug(companyId, data.slug);
    if (existing) {
      sendConflictResponse(res, 'Project with this slug already exists');
      return;
    }

    const project = await projectRepository.create(data);

    logger.info('Project created', { projectId: project._id, companyId, slug: project.slug });

    res.status(201).json({ project });
  } catch (error) {
    handleControllerError(res, error, 'create project');
  }
};

/**
 * Get project by ID
 */
export const getProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);

    const project = await projectRepository.findById(projectId);
    if (!project) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    res.json({ project });
  } catch (error) {
    handleControllerError(res, error, 'get project');
  }
};

/**
 * List projects in a company
 */
export const listProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      sendBadRequestResponse(res, 'Company ID required');
      return;
    }

    const { page, limit } = parsePaginationQuery(req);
    const status = req.query.status as string;
    const ownerId = req.query.ownerId as string;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;

    const result = await projectRepository.list(companyId, page, limit, {
      status,
      ownerId,
      tags,
    });

    const response = createPaginationResponse(result.projects, result.page, limit, result.total);
    res.json({ projects: response.items, pagination: response.pagination });
  } catch (error) {
    handleControllerError(res, error, 'list projects');
  }
};

/**
 * Update project
 */
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);
    const data = updateProjectSchema.parse(req.body);

    const project = await projectRepository.update(projectId, data);
    if (!project) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    logger.info('Project updated', { projectId, updates: Object.keys(data) });

    res.json({ project });
  } catch (error) {
    handleControllerError(res, error, 'update project');
  }
};

/**
 * Delete project (soft delete)
 */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);

    const success = await projectRepository.delete(projectId);
    if (!success) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    logger.info('Project deleted', { projectId });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    handleControllerError(res, error, 'delete project');
  }
};

/**
 * Archive/Unarchive project
 */
export const archiveProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);
    const { archive } = req.body;

    if (typeof archive !== 'boolean') {
      sendBadRequestResponse(res, 'archive must be a boolean');
      return;
    }

    const success = archive
      ? await projectRepository.archive(projectId)
      : await projectRepository.unarchive(projectId);

    if (!success) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    logger.info('Project archive status updated', { projectId, archived: archive });

    res.json({ message: `Project ${archive ? 'archived' : 'unarchived'} successfully` });
  } catch (error) {
    handleControllerError(res, error, 'update project archive status');
  }
};

/**
 * Get project stats
 */
export const getProjectStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);

    const stats = await projectRepository.getStats(projectId);
    if (!stats) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    res.json({ stats });
  } catch (error) {
    handleControllerError(res, error, 'get project stats');
  }
};

/**
 * List files in a project
 */
export const listProjectFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);
    const { page, limit } = parsePaginationQuery(req);

    const project = await projectRepository.findById(projectId);
    if (!project) {
      sendNotFoundResponse(res, 'Project');
      return;
    }

    const result = await fileMetadataRepository.list(projectId, page, limit);

    const response = createPaginationResponse(result.files, result.page, limit, result.total);
    res.json({ files: response.items, pagination: response.pagination });
  } catch (error) {
    handleControllerError(res, error, 'list project files');
  }
};

/**
 * Search projects
 */
export const searchProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      sendBadRequestResponse(res, 'Company ID required');
      return;
    }

    const searchTerm = req.query.q as string;
    if (!searchTerm) {
      sendBadRequestResponse(res, 'Search term required');
      return;
    }

    const { page, limit } = parsePaginationQuery(req);

    const result = await projectRepository.search(companyId, searchTerm, page, limit);

    const response = createPaginationResponse(result.projects, result.page, limit, result.total);
    res.json({ projects: response.items, pagination: response.pagination });
  } catch (error) {
    handleControllerError(res, error, 'search projects');
  }
};
