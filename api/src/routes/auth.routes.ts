import { Router } from 'express';
import { publicLogin } from '../controllers/auth.controller';

const router = Router();

// Public login route - no authentication required
router.post('/login', publicLogin);

export default router;
