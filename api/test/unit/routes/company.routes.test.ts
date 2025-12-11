import express from 'express';
import request from 'supertest';
import { Router } from 'express';

const companyRateLimiter = jest.fn((_req: unknown, _res: unknown, next: () => void) => next());

jest.mock('../../../src/middleware/company-rate-limiter.middleware', () => ({
  companyRateLimiter: (req: unknown, res: unknown, next: () => void) => companyRateLimiter(req, res, next),
}));

jest.mock('../../../src/middleware/rate-limiter.middleware', () => ({
  uploadLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  searchLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../../src/middleware/upload.middleware', () => ({
  MAX_FILES_PER_UPLOAD: 10,
  upload: {
    array: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));

jest.mock('../../../src/routes/project.routes', () => {
  const r = Router({ mergeParams: true });
  r.get('/', (_req, res) => res.json({ subroute: 'projects' }));
  return { __esModule: true, default: r };
});

jest.mock('../../../src/routes/user.routes', () => {
  const r = Router({ mergeParams: true });
  r.get('/', (_req, res) => res.json({ subroute: 'users' }));
  return { __esModule: true, default: r };
});

jest.mock('../../../src/routes/chat.routes', () => {
  const r = Router({ mergeParams: true });
  r.post('/', (_req, res) => res.json({ subroute: 'chat' }));
  return { __esModule: true, default: r };
});

jest.mock('../../../src/controllers/company.controller', () => {
  const handler =
    (name: string) =>
    (req: any, res: any): void => {
      res.status(200).json({ handler: name, companyId: req.params.companyId });
    };

  return {
    uploadFile: handler('uploadFile'),
    searchCompany: handler('searchCompany'),
    triggerConsistencyCheck: handler('triggerConsistencyCheck'),
    clearCache: handler('clearCache'),
    getCompanyVectors: handler('getCompanyVectors'),
    getCompanyStats: handler('getCompanyStats'),
  };
});

import companyRoutes from '../../../src/routes/company.routes';

describe('company.routes', () => {
  it('applies company rate limiter and handles company endpoints', async () => {
    const app = express();
    app.use(express.json());
    app.use('/v1/companies', companyRoutes);

    await request(app).get('/v1/companies/c1/stats').expect(200);
    await request(app).post('/v1/companies/c1/search').send({ query: 'q' }).expect(200);
    await request(app).get('/v1/companies/c1/vectors').expect(200);
    await request(app).delete('/v1/companies/c1/cache').expect(200);
    await request(app).post('/v1/companies/c1/consistency-check').expect(200);
    await request(app).post('/v1/companies/c1/uploads').expect(200);

    expect(companyRateLimiter).toHaveBeenCalled();
  });
});

