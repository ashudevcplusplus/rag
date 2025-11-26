import { Router, RequestHandler } from 'express';
import { authenticateRequest } from '../middleware/auth.middleware';
import companyRoutes from './company.routes';
import jobRoutes from './job.routes';
import healthRoutes from './health.routes';

const router = Router();

// Public Routes
router.use('/', healthRoutes);

// Protected Routes
router.use('/v1', authenticateRequest as RequestHandler); // Apply auth to all v1 routes
router.use('/v1/companies', companyRoutes);
router.use('/v1/jobs', jobRoutes);

export default router;
