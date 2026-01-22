import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../lib/response.js';
import { parseIntParam, parsePaginationParams } from '../lib/validation.js';
import * as invitationsService from '../services/invitations.service.js';

export const invitationsRouter = Router();

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
});

/**
 * POST /api/invitations - Create invitation
 * @see API Contract endpoint #15
 */
invitationsRouter.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = createInvitationSchema.parse(req.body);
  const invitation = await invitationsService.createInvitation(
    req.user!.organizationId,
    req.user!.userId,
    data
  );
  return sendCreated(res, invitation);
}));

/**
 * GET /api/invitations - List pending invitations
 * @see API Contract endpoint #16
 */
invitationsRouter.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  const { invitations, total } = await invitationsService.listInvitations(
    req.user!.organizationId,
    pagination
  );

  return sendPaginated(res, invitations, {
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
    totalCount: total,
  });
}));

/**
 * GET /api/invitations/:invitationId - Get invitation details
 * @see API Contract endpoint #17
 */
invitationsRouter.get('/:invitationId', asyncHandler(async (req, res) => {
  const invitationId = parseIntParam(req.params.invitationId, 'invitationId');
  const invitation = await invitationsService.getInvitation(invitationId);
  return sendSuccess(res, invitation);
}));

/**
 * DELETE /api/invitations/:invitationId - Cancel invitation
 * @see API Contract endpoint #18
 */
invitationsRouter.delete('/:invitationId', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const invitationId = parseIntParam(req.params.invitationId, 'invitationId');
  await invitationsService.cancelInvitation(invitationId, req.user!.organizationId);
  return sendNoContent(res);
}));
