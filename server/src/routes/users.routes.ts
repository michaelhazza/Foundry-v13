import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { sendSuccess, sendNoContent } from '../lib/response.js';
import { parseIntParam } from '../lib/validation.js';
import * as usersService from '../services/users.service.js';

export const usersRouter = Router();

// All user routes require authentication
usersRouter.use(requireAuth);

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

/**
 * GET /api/users/:userId - Get user details
 * @see API Contract endpoint #53
 */
usersRouter.get('/:userId', asyncHandler(async (req, res) => {
  const userId = parseIntParam(req.params.userId, 'userId');
  const user = await usersService.getUser(userId, req.user!.organizationId);
  return sendSuccess(res, user);
}));

/**
 * PATCH /api/users/:userId/role - Update user role
 * @see API Contract endpoint #54
 */
usersRouter.patch('/:userId/role', requireAdmin, asyncHandler(async (req, res) => {
  const userId = parseIntParam(req.params.userId, 'userId');
  const data = updateRoleSchema.parse(req.body);
  const user = await usersService.updateUserRole(
    userId,
    req.user!.organizationId,
    data.role,
    req.user!.userId
  );
  return sendSuccess(res, user);
}));

/**
 * DELETE /api/users/:userId - Remove user from org
 * @see API Contract endpoint #55
 */
usersRouter.delete('/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const userId = parseIntParam(req.params.userId, 'userId');
  await usersService.removeUser(userId, req.user!.organizationId, req.user!.userId);
  return sendNoContent(res);
}));
