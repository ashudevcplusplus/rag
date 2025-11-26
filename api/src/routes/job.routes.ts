import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { getJobStatus } from '../controllers/company.controller';

const router = Router();

router.get('/:jobId', asyncHandler(getJobStatus));

export default router;
