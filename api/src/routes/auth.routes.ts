import { Router, RequestHandler } from 'express';
import { publicLogin, getCurrentUser } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/user-auth.middleware';

const router = Router();

// Public login route - no authentication required
router.post('/login', publicLogin);

// Protected route - get current user info
router.get('/me', authenticateUser as RequestHandler, getCurrentUser);

export default router;
