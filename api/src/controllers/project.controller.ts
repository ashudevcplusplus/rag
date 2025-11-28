import { Request, Response } from 'express';
import { z } from 'zod';
import { projectRepository } from '../repositories/project.repository';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
} from '../schemas/project.schema';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Create a new project
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.context?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Company ID required' });
      return;
    }

    const data = createProjectSchema.parse({ ...req.body, companyId });

    // Check if slug already exists within this company
    const existing = await projectRepository.findBySlug(companyId, data.slug);
    if (existing) {
      res.status(409).json({ error: 'Project with this slug already exists' });
      return;
    }

    const project = await projectRepository.create(data);

    logger.info('Project created', { projectId: project._id, companyId, slug: project.slug });

    res.status(201).json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to create project', { error });
    throw error;
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
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to get project', { error });
    throw error;
  }
};

/**
 * List projects in a company
 */
export const listProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.context?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Company ID required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const ownerId = req.query.ownerId as string;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;

    const result = await projectRepository.list(companyId, page, limit, {
      status,
      ownerId,
      tags,
    });

    res.json({
      projects: result.projects,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('Failed to list projects', { error });
    throw error;
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
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    logger.info('Project updated', { projectId, updates: Object.keys(data) });

    res.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to update project', { error });
    throw error;
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
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    logger.info('Project deleted', { projectId });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to delete project', { error });
    throw error;
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
      res.status(400).json({ error: 'archive must be a boolean' });
      return;
    }

    const success = archive
      ? await projectRepository.archive(projectId)
      : await projectRepository.unarchive(projectId);

    if (!success) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    logger.info('Project archive status updated', { projectId, archived: archive });

    res.json({ message: `Project ${archive ? 'archived' : 'unarchived'} successfully` });
  } catch (error) {
    logger.error('Failed to update project archive status', { error });
    throw error;
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
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ stats });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to get project stats', { error });
    throw error;
  }
};

/**
 * List files in a project
 */
export const listProjectFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const project = await projectRepository.findById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await fileMetadataRepository.list(projectId, page, limit);

    res.json({
      files: result.files,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to list project files', { error });
    throw error;
  }
};

/**
 * Search projects
 */
export const searchProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.context?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Company ID required' });
      return;
    }

    const searchTerm = req.query.q as string;
    if (!searchTerm) {
      res.status(400).json({ error: 'Search term required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await projectRepository.search(companyId, searchTerm, page, limit);

    res.json({
      projects: result.projects,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('Failed to search projects', { error });
    throw error;
  }
};
