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
import {
  validateFileAccess,
  validateProjectAccess,
} from '../middleware/project-file-access.middleware';

const router = Router({ mergeParams: true });

// Project CRUD
router.post('/', createProject);
router.get('/', listProjects);
router.get('/search', searchProjects);
router.get('/:projectId', getProject);
router.patch('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);
router.post('/:projectId/archive', archiveProject);
router.get('/:projectId/stats', getProjectStats);

// Project files list (uses project-only validation)
router.get('/:projectId/files', listProjectFiles);

// File operations (uses full file access validation middleware)
router.get('/:projectId/files/:fileId', validateFileAccess, getFilePreview);
router.get('/:projectId/files/:fileId/download', validateFileAccess, downloadFile);
router.delete('/:projectId/files/:fileId', validateFileAccess, deleteFile);
router.post('/:projectId/files/:fileId/reindex', validateFileAccess, reindexFile);

// Indexing operations (uses project-only validation)
router.get('/:projectId/indexing/stats', validateProjectAccess, getIndexingStats);
router.post('/:projectId/indexing/retry-all', validateProjectAccess, bulkReindexFailed);

export default router;
