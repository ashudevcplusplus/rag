import express from 'express';
import request from 'supertest';

jest.mock('../../../src/middleware/rate-limiter.middleware', () => ({
  searchLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../../src/controllers/chat.controller', () => {
  const handler =
    (name: string) =>
    (req: any, res: any): void => {
      res.status(200).json({ handler: name, companyId: req.params.companyId });
    };

  return {
    chat: handler('chat'),
    chatStream: handler('chatStream'),
  };
});

import chatRoutes from '../../../src/routes/chat.routes';

describe('chat.routes', () => {
  it('POST / triggers chat handler', async () => {
    const app = express();
    app.use(express.json());
    app.use('/v1/companies/:companyId/chat', chatRoutes);

    const res = await request(app)
      .post('/v1/companies/c1/chat')
      .send({ query: 'hello' })
      .expect(200);
    expect(res.body).toEqual({ handler: 'chat', companyId: 'c1' });
  });

  it('POST /stream triggers chatStream handler', async () => {
    const app = express();
    app.use(express.json());
    app.use('/v1/companies/:companyId/chat', chatRoutes);

    const res = await request(app)
      .post('/v1/companies/c2/chat/stream')
      .send({ query: 'hello' })
      .expect(200);
    expect(res.body).toEqual({ handler: 'chatStream', companyId: 'c2' });
  });
});
