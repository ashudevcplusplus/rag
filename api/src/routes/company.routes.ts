import { Router } from 'express';
import { RequestHandler } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { uploadFile, searchCompany } from '../controllers/company.controller';
import { companyRateLimiter } from '../middleware/company-rate-limiter.middleware';
import { uploadLimiter, searchLimiter } from '../middleware/rate-limiter.middleware';
import { upload } from '../middleware/upload.middleware';
import projectRoutes from './project.routes';
import userRoutes from './user.routes';

const router = Router();

// Apply rate limiter to all company routes
router.use('/:companyId', companyRateLimiter as RequestHandler);

// Mount sub-routes
router.use('/:companyId/projects', projectRoutes);
router.use('/:companyId/users', userRoutes);

// Company specific routes
router.post('/:companyId/uploads', uploadLimiter, upload.single('file'), asyncHandler(uploadFile));

router.post('/:companyId/search', searchLimiter, asyncHandler(searchCompany));

export default router;
