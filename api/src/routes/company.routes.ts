import { Router } from 'express';
import { RequestHandler } from 'express';
import {
  uploadFile,
  searchCompany,
  triggerConsistencyCheck,
  clearCache,
  getCompanyVectors,
  getCompanyStats,
  getCompany,
} from '../controllers/company.controller';
import { companyRateLimiter } from '../middleware/company-rate-limiter.middleware';
import { uploadLimiter, searchLimiter } from '../middleware/rate-limiter.middleware';
import { upload, MAX_FILES_PER_UPLOAD } from '../middleware/upload.middleware';
import projectRoutes from './project.routes';
import userRoutes from './user.routes';
import chatV2Routes from './chat-v2.routes';
import conversationRoutes from './conversation.routes';

const router = Router();

// Apply rate limiter to all company routes
router.use('/:companyId', companyRateLimiter as RequestHandler);

// Mount sub-routes
router.use('/:companyId/projects', projectRoutes);
router.use('/:companyId/users', userRoutes);
router.use('/:companyId/chat', chatV2Routes); // V2 is now the only chat API
router.use('/:companyId/conversations', conversationRoutes);

// Company specific routes
router.get('/:companyId', getCompany);
router.get('/:companyId/stats', getCompanyStats);
router.post(
  '/:companyId/uploads',
  uploadLimiter,
  upload.array('files', MAX_FILES_PER_UPLOAD),
  uploadFile
);
router.get('/:companyId/vectors', getCompanyVectors);

router.post('/:companyId/search', searchLimiter, searchCompany);

// Consistency check routes
router.post('/:companyId/consistency-check', triggerConsistencyCheck);
router.post('/consistency-check', triggerConsistencyCheck); // Check all companies

// Cache management routes
router.delete('/:companyId/cache', clearCache);
router.delete('/cache', clearCache); // Clear all cache

export default router;
