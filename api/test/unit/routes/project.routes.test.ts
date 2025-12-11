import express from 'express';
import request from 'supertest';

jest.mock('../../../src/controllers/project.controller', () => {
  const handler =
    (name: string, status = 200) =>
    (req: any, res: any): void => {
      res
        .status(status)
        .json({ handler: name, companyId: req.params.companyId, projectId: req.params.projectId });
    };

  return {
    createProject: handler('createProject', 201),
    getProject: handler('getProject'),
    listProjects: handler('listProjects'),
    updateProject: handler('updateProject'),
    deleteProject: handler('deleteProject'),
    archiveProject: handler('archiveProject'),
    getProjectStats: handler('getProjectStats'),
    searchProjects: handler('searchProjects'),
    listProjectFiles: handler('listProjectFiles'),
    getFilePreview: handler('getFilePreview'),
    deleteFile: handler('deleteFile'),
    downloadFile: handler('downloadFile'),
    reindexFile: handler('reindexFile'),
    getIndexingStats: handler('getIndexingStats'),
    bulkReindexFailed: handler('bulkReindexFailed'),
  };
});

import projectRoutes from '../../../src/routes/project.routes';

describe('project.routes', () => {
  it('mounts and handles key endpoints', async () => {
    const app = express();
    app.use(express.json());
    app.use('/v1/companies/:companyId/projects', projectRoutes);

    await request(app).post('/v1/companies/c1/projects').send({ name: 'p' }).expect(201);
    await request(app).get('/v1/companies/c1/projects').expect(200);
    await request(app).get('/v1/companies/c1/projects/search').expect(200);
    const res = await request(app).get('/v1/companies/c1/projects/p1').expect(200);
    expect(res.body).toEqual({ handler: 'getProject', companyId: 'c1', projectId: 'p1' });
  });
});
