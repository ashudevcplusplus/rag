import { Router } from 'express';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  archiveProject,
  getProjectStats,
  searchProjects,
  listProjectFiles,
} from '../controllers/project.controller';

const router = Router({ mergeParams: true });

router.post('/', createProject);
router.get('/', listProjects);
router.get('/search', searchProjects);
router.get('/:projectId', getProject);
router.get('/:projectId/files', listProjectFiles);
router.patch('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);
router.post('/:projectId/archive', archiveProject);
router.get('/:projectId/stats', getProjectStats);

export default router;
