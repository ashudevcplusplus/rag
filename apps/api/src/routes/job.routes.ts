import { Router } from 'express';
import { getJobStatus, getConsistencyCheckJobStatus } from '../controllers/company.controller';

const router = Router();

router.get('/:jobId', getJobStatus);
router.get('/consistency/:jobId', getConsistencyCheckJobStatus);

export default router;
