import { Request, Response } from 'express';
import { z } from 'zod';
import { userRepository } from '../repositories/user.repository';
import { companyRepository } from '../repositories/company.repository';
import { logger } from '../utils/logger';
import { sendBadRequestResponse, sendUnauthorizedResponse } from '../utils/response.util';
import { removePasswordHash } from '../utils/object.util';
import { asyncHandler } from '../middleware/error.middleware';
import { generateToken } from '../utils/jwt.util';

// Login schema - just email and password
const publicLoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Public login - no API key or company ID required
 * Users login with just email and password
 * Company is determined from the user's record
 */
export const publicLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const parseResult = publicLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    sendBadRequestResponse(res, parseResult.error.issues[0]?.message || 'Invalid request');
    return;
  }

  const { email, password } = parseResult.data;

  // Find user by email
  const user = await userRepository.findByEmail(email);
  if (!user) {
    sendUnauthorizedResponse(res, 'Invalid email or password');
    return;
  }

  // Find the company from user's record
  const company = await companyRepository.findById(user.companyId);
  if (!company) {
    sendUnauthorizedResponse(res, 'Company not found');
    return;
  }

  // Check company status
  if (company.status !== 'ACTIVE') {
    sendUnauthorizedResponse(res, 'Company account is not active');
    return;
  }

  // Check if user is active
  if (!user.isActive) {
    sendUnauthorizedResponse(res, 'User account is inactive');
    return;
  }

  // Check if account is locked
  const isLocked = await userRepository.isLocked(user._id);
  if (isLocked) {
    sendUnauthorizedResponse(res, 'Account is locked due to too many failed login attempts');
    return;
  }

  // Verify password
  const isValidPassword = await userRepository.verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    await userRepository.incrementFailedLoginAttempts(user._id);
    sendUnauthorizedResponse(res, 'Invalid email or password');
    return;
  }

  // Update last login
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  await userRepository.updateLastLogin(user._id, ipAddress);

  // Generate JWT token
  const token = generateToken({
    userId: user._id,
    companyId: user.companyId,
    email: user.email,
    role: user.role,
  });

  logger.info('User logged in via public login', {
    userId: user._id,
    email: user.email,
    companyId: user.companyId,
  });

  // Remove sensitive data
  const userResponse = removePasswordHash(user);

  res.json({
    message: 'Login successful',
    user: userResponse,
    token,
  });
});
