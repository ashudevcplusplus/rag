import { Router, RequestHandler } from 'express';
import { authenticateRequest } from '../middleware/auth.middleware';
import { apiLoggingMiddleware } from '../middleware/api-logging.middleware';
import companyRoutes from './company.routes';
import jobRoutes from './job.routes';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';

const router = Router();

// Public Routes
router.use('/', healthRoutes);
router.use('/v1/auth', authRoutes); // Public auth routes (login without API key)

// Protected Routes
router.use('/v1', authenticateRequest as RequestHandler);
router.use('/v1', apiLoggingMiddleware as RequestHandler); // Apply auth to all v1 routes
router.use('/v1/companies', companyRoutes);
router.use('/v1/jobs', jobRoutes);

export default router;
