import request from 'supertest';
import { Router } from 'express';

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@bull-board/api', () => ({
  createBullBoard: jest.fn(),
}));

jest.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@bull-board/express', () => ({
  ExpressAdapter: jest.fn().mockImplementation(() => ({
    setBasePath: jest.fn(),
    getRouter: () => Router(),
  })),
}));

jest.mock('../../../src/queue/async-tasks.queue', () => ({
  indexingQueue: {},
  consistencyCheckQueue: {},
  allAsyncTaskQueues: [],
}));

jest.mock('../../../src/middleware/rate-limiter.middleware', () => ({
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  uploadLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  searchLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../../src/utils/async-events.util', () => ({
  publishErrorLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/routes', () => {
  const r = Router();
  r.get('/health', (_req, res) => res.json({ status: 'ok' }));
  r.get('/boom', (_req, _res, next) => next(new Error('boom')));
  return { __esModule: true, default: r };
});

import { createApp } from '../../../src/server';

describe('createApp (server wiring)', () => {
  it('serves health and returns 404 JSON for unknown routes', async () => {
    const app = createApp();

    await request(app).get('/health').expect(200);
    const res404 = await request(app).get('/does-not-exist').expect(404);
    expect(res404.body).toEqual({ error: 'Route not found' });
  });

  it('uses error handler for thrown errors', async () => {
    const app = createApp();

    const res = await request(app).get('/boom').expect(500);
    expect(res.body).toHaveProperty('error', 'boom');
    expect(res.body).toHaveProperty('statusCode', 500);
  });
});
