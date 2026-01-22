import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { sendSuccess, sendCreated, sendNoContent } from '../lib/response.js';
import * as authService from '../services/auth.service.js';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  invitationToken: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase letter and number'),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase letter and number'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase letter and number'),
});

/**
 * POST /api/auth/register - Register new user with invitation
 * @see API Contract endpoint #2
 */
authRouter.post('/register', authRateLimiter, asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  return sendCreated(res, result);
}));

/**
 * POST /api/auth/login - Authenticate user
 * @see API Contract endpoint #3
 */
authRouter.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);
  return sendSuccess(res, result);
}));

/**
 * POST /api/auth/refresh - Refresh access token
 * @see API Contract endpoint #4
 */
authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const data = refreshSchema.parse(req.body);
  const result = await authService.refreshTokens(data.refreshToken);
  return sendSuccess(res, result);
}));

/**
 * POST /api/auth/logout - Logout user
 * @see API Contract endpoint #5
 */
authRouter.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await authService.logout(req.user!.userId);
  return sendNoContent(res);
}));

/**
 * GET /api/auth/me - Get current user profile
 * @see API Contract endpoint #6
 */
authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.userId);
  return sendSuccess(res, user);
}));

/**
 * PATCH /api/auth/profile - Update user profile
 * @see API Contract endpoint #7
 */
authRouter.patch('/profile', requireAuth, asyncHandler(async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user!.userId, data);
  return sendSuccess(res, user);
}));

/**
 * PATCH /api/auth/password - Change password
 * @see API Contract endpoint #8
 */
authRouter.patch('/password', requireAuth, asyncHandler(async (req, res) => {
  const data = changePasswordSchema.parse(req.body);
  await authService.changePassword(
    req.user!.userId,
    data.currentPassword,
    data.newPassword
  );
  return sendSuccess(res, { message: 'Password updated successfully' });
}));

/**
 * POST /api/auth/forgot-password - Request password reset
 * @see API Contract endpoint #9
 */
authRouter.post('/forgot-password', authRateLimiter, asyncHandler(async (req, res) => {
  const data = forgotPasswordSchema.parse(req.body);
  await authService.forgotPassword(data.email);
  return sendSuccess(res, { message: 'If the email exists, a reset link has been sent' });
}));

/**
 * GET /api/auth/reset-password/:token - Validate reset token
 * @see API Contract endpoint #10
 */
authRouter.get('/reset-password/:token', asyncHandler(async (req, res) => {
  const result = await authService.validateResetToken(req.params.token);
  return sendSuccess(res, result);
}));

/**
 * POST /api/auth/reset-password - Complete password reset
 * @see API Contract endpoint #11
 */
authRouter.post('/reset-password', authRateLimiter, asyncHandler(async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(data.token, data.newPassword);
  return sendSuccess(res, { message: 'Password reset successfully' });
}));
