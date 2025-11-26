import { Request, Response } from 'express';
import { z } from 'zod';
import { userRepository } from '../repositories/user.repository';
import { createUserSchema, updateUserSchema, userIdSchema } from '../schemas/user.schema';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.context?.companyId || req.body.companyId;

    const data = createUserSchema.parse({ ...req.body, companyId });

    // Check if email already exists
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      res.status(409).json({ error: 'User with this email already exists' });
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
    const userObj = user as unknown as Record<string, unknown>;
    const { passwordHash: _, ...userResponse } = userObj;

    res.status(201).json({ user: userResponse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to create user', { error });
    throw error;
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
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Remove sensitive data
    const userObj = user as unknown as Record<string, unknown>;
    const { passwordHash: _, ...userResponse } = userObj;

    res.json({ user: userResponse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to get user', { error });
    throw error;
  }
};

/**
 * List users in a company
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.context?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Company ID required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;

    const result = await userRepository.list(companyId, page, limit, {
      role,
      isActive,
    });

    // Remove sensitive data
    const usersResponse = result.users.map((user) => {
      const userObj = user as unknown as Record<string, unknown>;
      const { passwordHash: _, ...userResponse } = userObj;
      return userResponse;
    });

    res.json({
      users: usersResponse,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('Failed to list users', { error });
    throw error;
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
      res.status(404).json({ error: 'User not found' });
      return;
    }

    logger.info('User updated', { userId, updates: Object.keys(data) });

    // Remove sensitive data
    const userObj = user as unknown as Record<string, unknown>;
    const { passwordHash: _, ...userResponse } = userObj;

    res.json({ user: userResponse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to update user', { error });
    throw error;
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
      res.status(404).json({ error: 'User not found' });
      return;
    }

    logger.info('User deleted', { userId });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Failed to delete user', { error });
    throw error;
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
      res.status(400).json({ error: 'isActive must be a boolean' });
      return;
    }

    const success = await userRepository.setActive(userId, isActive);
    if (!success) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    logger.info('User active status updated', { userId, isActive });

    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    logger.error('Failed to update user active status', { error });
    throw error;
  }
};
