import express from 'express';
import request from 'supertest';

jest.mock('../../../src/controllers/user.controller', () => {
  const handler =
    (name: string, status = 200) =>
    (req: any, res: any): void => {
      res
        .status(status)
        .json({ handler: name, companyId: req.params.companyId, userId: req.params.userId });
    };

  return {
    createUser: handler('createUser', 201),
    getUser: handler('getUser'),
    listUsers: handler('listUsers'),
    updateUser: handler('updateUser'),
    deleteUser: handler('deleteUser'),
    setUserActive: handler('setUserActive'),
  };
});

import userRoutes from '../../../src/routes/user.routes';

describe('user.routes', () => {
  it('mounts and handles key endpoints', async () => {
    const app = express();
    app.use(express.json());
    app.use('/v1/companies/:companyId/users', userRoutes);

    await request(app).post('/v1/companies/c1/users').send({ email: 'a@b.com' }).expect(201);
    await request(app).get('/v1/companies/c1/users').expect(200);
    const res = await request(app).get('/v1/companies/c1/users/u1').expect(200);
    expect(res.body).toEqual({ handler: 'getUser', companyId: 'c1', userId: 'u1' });
  });
});
