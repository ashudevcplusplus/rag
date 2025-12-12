import express from 'express';
import request from 'supertest';
import { Router } from 'express';

const authenticateRequest = jest.fn((_req: unknown, _res: unknown, next: () => void) => next());
const apiLoggingMiddleware = jest.fn((_req: unknown, _res: unknown, next: () => void) => next());

jest.mock('../../../src/middleware/auth.middleware', () => ({
  authenticateRequest: (req: unknown, res: unknown, next: () => void) =>
    authenticateRequest(req, res, next),
}));

jest.mock('../../../src/middleware/api-logging.middleware', () => ({
  apiLoggingMiddleware: (req: unknown, res: unknown, next: () => void) =>
    apiLoggingMiddleware(req, res, next),
}));

jest.mock('../../../src/routes/company.routes', () => {
  const r = Router();
  r.get('/ping', (_req, res) => res.json({ ok: true }));
  return { __esModule: true, default: r };
});

jest.mock('../../../src/routes/job.routes', () => {
  const r = Router();
  r.get('/ping', (_req, res) => res.json({ ok: true }));
  return { __esModule: true, default: r };
});

import routes from '../../../src/routes';

describe('routes/index', () => {
  it('serves public health routes without auth', async () => {
    const app = express();
    app.use(routes);

    await request(app).get('/health').expect(200);
    expect(authenticateRequest).not.toHaveBeenCalled();
  });

  it('applies auth + logging for /v1/* routes', async () => {
    const app = express();
    app.use(routes);

    await request(app).get('/v1/companies/ping').expect(200);
    await request(app).get('/v1/jobs/ping').expect(200);

    expect(authenticateRequest).toHaveBeenCalled();
    expect(apiLoggingMiddleware).toHaveBeenCalled();
  });
});
