import { Request, Response } from 'express';
import { projectRepository } from '../repositories/project.repository';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { DeletionService } from '../services/deletion.service';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
} from '../schemas/project.schema';
import { logger } from '../utils/logger';
import { publishAnalytics } from '../utils/async-events.util';
import { AnalyticsEventType } from '../types/enums';
import {
  sendConflictResponse,
  sendNotFoundResponse,
  sendBadRequestResponse,
} from '../utils/response.util';
import { getCompanyId } from '../utils/request.util';
import { parsePaginationQuery, createPaginationResponse } from '../utils/pagination.util';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Create a new project
 */
export const createProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const companyId = getCompanyId(req);
  if (!companyId) {
    sendBadRequestResponse(res, 'Company ID required');
    return;
  }

  // Parse and validate input
  const parsedData = createProjectSchema.parse({ ...req.body, companyId });

  // Set ownerId to companyId if not provided (fallback for API key based auth)
  const data = {
    ...parsedData,
    ownerId: parsedData.ownerId || companyId,
  };

  // Check if slug already exists within this company
  const existing = await projectRepository.findBySlug(companyId, data.slug);
  if (existing) {
    sendConflictResponse(res, 'Project with this slug already exists');
    return;
  }

  const project = await projectRepository.create(data);

  logger.info('Project created', { projectId: project._id, companyId, slug: project.slug });

  // One-line event publishing
  publishAnalytics({
    eventType: AnalyticsEventType.PROJECT_CREATE,
    companyId,
    projectId: project._id,
    metadata: { slug: project.slug, name: project.name },
  });

  res.status(201).json({ project });
});

/**
 * Get project by ID
 */
export const getProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);

  const project = await projectRepository.findById(projectId);
  if (!project) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  res.json({ project });
});

/**
 * List projects in a company
 */
export const listProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
});

/**
 * Update project
 */
export const updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);
  const data = updateProjectSchema.parse(req.body);

  const project = await projectRepository.update(projectId, data);
  if (!project) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  logger.info('Project updated', { projectId, updates: Object.keys(data) });

  // One-line event publishing
  const companyId = getCompanyId(req);
  if (companyId) {
    publishAnalytics({
      eventType: AnalyticsEventType.PROJECT_UPDATE,
      companyId,
      projectId,
      metadata: { updatedFields: Object.keys(data) },
    });
  }

  res.json({ project });
});

/**
 * Delete project (soft delete with cascade cleanup)
 */
export const deleteProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);

  const success = await DeletionService.deleteProject(projectId);
  if (!success) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  logger.info('Project deleted', { projectId });

  // One-line event publishing
  const companyId = getCompanyId(req);
  if (companyId) {
    publishAnalytics({ eventType: AnalyticsEventType.PROJECT_DELETE, companyId, projectId });
  }

  res.json({ message: 'Project deleted successfully' });
});

/**
 * Archive/Unarchive project
 */
export const archiveProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
});

/**
 * Get project stats
 */
export const getProjectStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { projectId } = projectIdSchema.parse(req.params);

  const stats = await projectRepository.getStats(projectId);
  if (!stats) {
    sendNotFoundResponse(res, 'Project');
    return;
  }

  res.json({ stats });
});

/**
 * List files in a project
 */
export const listProjectFiles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
});

/**
 * Search projects
 */
export const searchProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
});
