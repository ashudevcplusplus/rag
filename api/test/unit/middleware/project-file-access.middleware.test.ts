import { Request, Response, NextFunction } from 'express';
import {
  validateFileAccess,
  validateProjectAccess,
} from '../../../src/middleware/project-file-access.middleware';
import { projectRepository } from '../../../src/repositories/project.repository';
import { fileMetadataRepository } from '../../../src/repositories/file-metadata.repository';
import {
  createMockResponse,
  createMockAuthenticatedRequest,
  createMockRequest,
  createMockCompany,
  createMockProject,
  createMockFileMetadata,
  MockExpressResponse,
} from '../../lib/mock-utils';

// Mock dependencies
jest.mock('../../../src/repositories/project.repository');
jest.mock('../../../src/repositories/file-metadata.repository');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Helper to wait for async middleware wrapped with asyncHandler
 */
function waitForMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
  res: Response,
  next: jest.Mock
): Promise<void> {
  return new Promise<void>((resolve) => {
    const nextFn: NextFunction = ((err?: unknown) => {
      if (err) next(err);
      else next();
      resolve();
    }) as NextFunction;

    middleware(req, res, nextFn);
    // Fallback timeout in case res.status().json() is called instead of next()
    setTimeout(resolve, 50);
  });
}

describe('Project File Access Middleware', () => {
  let mockRes: MockExpressResponse;
  let mockNext: jest.Mock;
  const mockCompany = createMockCompany();
  const mockProject = createMockProject(mockCompany._id);
  const mockFile = createMockFileMetadata(mockProject._id);
  const projectId = mockProject._id;
  const fileId = mockFile._id;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    mockNext = jest.fn();
  });

  describe('validateFileAccess', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        params: { projectId, fileId },
      });

      await waitForMiddleware(
        validateFileAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId: 'non-existent', fileId },
      });

      await waitForMiddleware(
        validateFileAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when project belongs to different company', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId, fileId },
      });

      await waitForMiddleware(
        validateFileAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when file not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (fileMetadataRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId, fileId: 'non-existent' },
      });

      await waitForMiddleware(
        validateFileAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when file belongs to different project', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (fileMetadataRepository.findById as jest.Mock).mockResolvedValue({
        ...mockFile,
        projectId: 'different-project',
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId, fileId },
      });

      await waitForMiddleware(
        validateFileAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach validated data and call next on success', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (fileMetadataRepository.findById as jest.Mock).mockResolvedValue(mockFile);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId, fileId },
      });

      await waitForMiddleware(
        validateFileAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockReq as any).validatedProject).toEqual(mockProject);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockReq as any).validatedFile).toEqual(mockFile);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockReq as any).validatedCompanyId).toEqual(mockCompany._id);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateProjectAccess', () => {
    it('should return 400 when company ID is not provided', async () => {
      const mockReq = createMockRequest({
        params: { projectId },
      });

      await waitForMiddleware(
        validateProjectAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId: 'non-existent' },
      });

      await waitForMiddleware(
        validateProjectAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when project belongs to different company', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        companyId: 'different-company',
      });

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId },
      });

      await waitForMiddleware(
        validateProjectAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach validated data and call next on success', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);

      const mockReq = createMockAuthenticatedRequest(mockCompany, {
        params: { projectId },
      });

      await waitForMiddleware(
        validateProjectAccess,
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockReq as any).validatedProject).toEqual(mockProject);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockReq as any).validatedCompanyId).toEqual(mockCompany._id);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
