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
  getFilePreview,
  deleteFile,
  downloadFile,
  reindexFile,
  getIndexingStats,
  bulkReindexFailed,
} from '../controllers/project.controller';

const router = Router({ mergeParams: true });

router.post('/', createProject);
router.get('/', listProjects);
router.get('/search', searchProjects);
router.get('/:projectId', getProject);
router.get('/:projectId/files', listProjectFiles);
router.get('/:projectId/files/:fileId', getFilePreview);
router.get('/:projectId/files/:fileId/download', downloadFile);
router.delete('/:projectId/files/:fileId', deleteFile);
router.post('/:projectId/files/:fileId/reindex', reindexFile);
router.get('/:projectId/indexing/stats', getIndexingStats);
router.post('/:projectId/indexing/retry-all', bulkReindexFailed);
router.patch('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);
router.post('/:projectId/archive', archiveProject);
router.get('/:projectId/stats', getProjectStats);

export default router;
