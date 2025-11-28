import { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { createUserSchema, updateUserSchema, userIdSchema } from '../schemas/user.schema';
import { logger } from '../utils/logger';
import {
  handleControllerError,
  sendConflictResponse,
  sendNotFoundResponse,
  sendBadRequestResponse,
} from '../utils/response.util';
import { removePasswordHash, removePasswordHashFromArray } from '../utils/object.util';
import { getCompanyId } from '../utils/request.util';
import { parsePaginationQuery, createPaginationResponse } from '../utils/pagination.util';

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      sendBadRequestResponse(res, 'Company ID required');
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
  } catch (error) {
    handleControllerError(res, error, 'create user');
  }
};

/**
 * Get user by ID
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = userIdSchema.parse(req.params);

    const user = await userRepository.findById(userId);
    if (!user) {
      sendNotFoundResponse(res, 'User');
      return;
    }

    // Remove sensitive data
    const userResponse = removePasswordHash(user);

    res.json({ user: userResponse });
  } catch (error) {
    handleControllerError(res, error, 'get user');
  }
};

/**
 * List users in a company
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    handleControllerError(res, error, 'list users');
  }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    handleControllerError(res, error, 'update user');
  }
};

/**
 * Delete user (soft delete)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = userIdSchema.parse(req.params);

    const success = await userRepository.delete(userId);
    if (!success) {
      sendNotFoundResponse(res, 'User');
      return;
    }

    logger.info('User deleted', { userId });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    handleControllerError(res, error, 'delete user');
  }
};

/**
 * Activate/Deactivate user
 */
export const setUserActive = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    handleControllerError(res, error, 'update user active status');
  }
};
