import express from 'express';
import request from 'supertest';

jest.mock('../../../src/controllers/company.controller', () => {
  const handler =
    (name: string) =>
    (req: any, res: any): void => {
      res.status(200).json({ handler: name, jobId: req.params.jobId });
    };

  return {
    getJobStatus: handler('getJobStatus'),
    getConsistencyCheckJobStatus: handler('getConsistencyCheckJobStatus'),
  };
});

import jobRoutes from '../../../src/routes/job.routes';

describe('job.routes', () => {
  it('GET /:jobId returns job status', async () => {
    const app = express();
    app.use('/v1/jobs', jobRoutes);

    const res = await request(app).get('/v1/jobs/j1').expect(200);
    expect(res.body).toEqual({ handler: 'getJobStatus', jobId: 'j1' });
  });

  it('GET /consistency/:jobId returns consistency job status', async () => {
    const app = express();
    app.use('/v1/jobs', jobRoutes);

    const res = await request(app).get('/v1/jobs/consistency/j2').expect(200);
    expect(res.body).toEqual({ handler: 'getConsistencyCheckJobStatus', jobId: 'j2' });
  });
});

