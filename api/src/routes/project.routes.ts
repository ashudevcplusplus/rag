import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  archiveProject,
  getProjectStats,
  searchProjects,
} from '../controllers/project.controller';

const router = Router({ mergeParams: true });

router.post('/', asyncHandler(createProject));
router.get('/', asyncHandler(listProjects));
router.get('/search', asyncHandler(searchProjects));
router.get('/:projectId', asyncHandler(getProject));
router.patch('/:projectId', asyncHandler(updateProject));
router.delete('/:projectId', asyncHandler(deleteProject));
router.post('/:projectId/archive', asyncHandler(archiveProject));
router.get('/:projectId/stats', asyncHandler(getProjectStats));

export default router;
