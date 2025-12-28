import { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { companyRepository } from '../repositories/company.repository';
import { createUserSchema, updateUserSchema, userIdSchema } from '../schemas/user.schema';
import { logger } from '../utils/logger';
import {
  sendConflictResponse,
  sendNotFoundResponse,
  sendBadRequestResponse,
} from '../utils/response.util';
import { removePasswordHash, removePasswordHashFromArray } from '../utils/object.util';
import { getCompanyId } from '../utils/request.util';
import { parsePaginationQuery, createPaginationResponse } from '../utils/pagination.util';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Create a new user
 */
export const createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const companyId = getCompanyId(req);
  if (!companyId) {
    sendBadRequestResponse(res, 'Company ID required');
    return;
  }

  // Check user limit (default 4 users per company)
  const company = await companyRepository.findById(companyId);
  if (!company) {
    sendNotFoundResponse(res, 'Company');
    return;
  }

  const userCount = await userRepository.countByCompanyId(companyId);
  const maxUsers = company.maxUsers || 4;
  if (userCount >= maxUsers) {
    sendBadRequestResponse(res, `Maximum user limit (${maxUsers}) reached for this company`);
    return;
  }

  const data = createUserSchema.parse({ ...req.body, companyId });

  // Check if email already exists
  const existing = await userRepository.findByEmail(data.email);
  if (existing) {
    sendConflictResponse(res, 'User with this email already exists');
    return;
  }

  // Hash password
  const passwordHash = await userRepository.hashPassword(data.password);

  // Create user
  const user = await userRepository.create({
    ...data,
    passwordHash,
  });

  logger.info('User created', { userId: user._id, email: user.email, companyId });

  // Remove sensitive data
  const userResponse = removePasswordHash(user);

  res.status(201).json({ user: userResponse });
});

/**
 * Get user by ID
 */
export const getUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = userIdSchema.parse(req.params);

  const user = await userRepository.findById(userId);
  if (!user) {
    sendNotFoundResponse(res, 'User');
    return;
  }

  // Remove sensitive data
  const userResponse = removePasswordHash(user);

  res.json({ user: userResponse });
});

/**
 * List users in a company
 */
export const listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const companyId = getCompanyId(req);
  if (!companyId) {
    sendBadRequestResponse(res, 'Company ID required');
    return;
  }

  const { page, limit } = parsePaginationQuery(req);
  const role = req.query.role as string;
  const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;

  const result = await userRepository.list(companyId, page, limit, {
    role,
    isActive,
  });

  // Remove sensitive data
  const usersResponse = removePasswordHashFromArray(result.users);

  const response = createPaginationResponse(usersResponse, result.page, limit, result.total);
  res.json({ users: response.items, pagination: response.pagination });
});

/**
 * Update user
 */
export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = userIdSchema.parse(req.params);
  const data = updateUserSchema.parse(req.body);

  const user = await userRepository.update(userId, data);
  if (!user) {
    sendNotFoundResponse(res, 'User');
    return;
  }

  logger.info('User updated', { userId, updates: Object.keys(data) });

  // Remove sensitive data
  const userResponse = removePasswordHash(user);

  res.json({ user: userResponse });
});

/**
 * Delete user (soft delete)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = userIdSchema.parse(req.params);

  const success = await userRepository.delete(userId);
  if (!success) {
    sendNotFoundResponse(res, 'User');
    return;
  }

  logger.info('User deleted', { userId });

  res.json({ message: 'User deleted successfully' });
});

/**
 * Activate/Deactivate user
 */
export const setUserActive = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = userIdSchema.parse(req.params);
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    sendBadRequestResponse(res, 'isActive must be a boolean');
    return;
  }

  const success = await userRepository.setActive(userId, isActive);
  if (!success) {
    sendNotFoundResponse(res, 'User');
    return;
  }

  logger.info('User active status updated', { userId, isActive });

  res.json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
});
