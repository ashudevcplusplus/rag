import { Router } from 'express';
import { subscribe, unsubscribe } from '../controllers/newsletter.controller';
import { newsletterLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// Public endpoints
router.post('/subscribe', newsletterLimiter, subscribe);
router.post('/unsubscribe', newsletterLimiter, unsubscribe);

export default router;

