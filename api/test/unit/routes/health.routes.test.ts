import express from 'express';
import request from 'supertest';
import healthRoutes from '../../../src/routes/health.routes';

describe('health.routes', () => {
  it('GET /health returns ok + timestamp', async () => {
    const app = express();
    app.use(healthRoutes);

    const res = await request(app).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(typeof res.body.timestamp).toBe('string');
    expect(res.body.timestamp.length).toBeGreaterThan(0);
  });

  it('GET / returns API metadata', async () => {
    const app = express();
    app.use(healthRoutes);

    const res = await request(app).get('/').expect(200);
    expect(res.body).toHaveProperty('message', 'RAG System API');
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('endpoints');
  });
});
