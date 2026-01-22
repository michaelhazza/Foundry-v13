import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../lib/response.js';
import { parsePaginationParams } from '../lib/validation.js';
import * as organizationsService from '../services/organizations.service.js';

export const organizationsRouter = Router();

// All organization routes require authentication
organizationsRouter.use(requireAuth);

const updateOrgSchema = z.object({
  name: z.string().min(1).max(255),
});

/**
 * GET /api/organizations/current - Get current organization
 * @see API Contract endpoint #12
 */
organizationsRouter.get('/current', asyncHandler(async (req, res) => {
  const org = await organizationsService.getCurrentOrganization(req.user!.organizationId);
  return sendSuccess(res, org);
}));

/**
 * PATCH /api/organizations/current - Update organization
 * @see API Contract endpoint #13
 */
organizationsRouter.patch('/current', requireAdmin, asyncHandler(async (req, res) => {
  const data = updateOrgSchema.parse(req.body);
  const org = await organizationsService.updateOrganization(req.user!.organizationId, data);
  return sendSuccess(res, org);
}));

/**
 * GET /api/organizations/members - List organization members
 * @see API Contract endpoint #14
 */
organizationsRouter.get('/members', asyncHandler(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  const { members, total } = await organizationsService.listMembers(
    req.user!.organizationId,
    pagination
  );

  return sendPaginated(res, members, {
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
    totalCount: total,
  });
}));
