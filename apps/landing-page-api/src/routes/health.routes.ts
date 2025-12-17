import { Router } from 'express';
import { healthCheck, liveness, readiness } from '../controllers/health.controller';

const router = Router();

router.get('/health', healthCheck);
router.get('/health/live', liveness);
router.get('/health/ready', readiness);

export default router;

