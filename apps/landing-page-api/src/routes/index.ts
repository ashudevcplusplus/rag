import { Router } from 'express';
import healthRoutes from './health.routes';
import contactRoutes from './contact.routes';
import newsletterRoutes from './newsletter.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Public routes
router.use('/', healthRoutes);
router.use('/api/contact', contactRoutes);
router.use('/api/newsletter', newsletterRoutes);

// Admin routes (in production, add authentication middleware here)
router.use('/api/admin', adminRoutes);

export default router;

