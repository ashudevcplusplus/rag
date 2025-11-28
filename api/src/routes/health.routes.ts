import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/', (_req, res) => {
  res.json({
    message: 'RAG System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      upload: 'POST /v1/companies/:companyId/uploads',
      search: 'POST /v1/companies/:companyId/search',
      jobStatus: 'GET /v1/jobs/:jobId',
      queueDashboard: '/admin/queues'
    },
    documentation: 'See README.md for API documentation'
  });
});

export default router;
