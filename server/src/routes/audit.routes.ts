import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../lib/response.js';
import { parseIntParam, parsePaginationParams } from '../lib/validation.js';
import * as auditService from '../services/audit.service.js';

export const auditRouter = Router();

// All audit routes require authentication and admin role
auditRouter.use(requireAuth);
auditRouter.use(requireAdmin);

/**
 * GET /api/audit-logs - List audit logs
 * @see API Contract endpoint #51
 */
auditRouter.get('/', asyncHandler(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  pagination.limit = Math.min(pagination.limit, 50); // Default limit for audit logs

  const { logs, total } = await auditService.listAuditLogs(
    req.user!.organizationId,
    pagination
  );

  return sendPaginated(res, logs, {
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
    totalCount: total,
  });
}));

/**
 * GET /api/audit-logs/:logId - Get audit log details
 * @see API Contract endpoint #52
 */
auditRouter.get('/:logId', asyncHandler(async (req, res) => {
  const logId = parseIntParam(req.params.logId, 'logId');
  const log = await auditService.getAuditLog(logId, req.user!.organizationId);
  return sendSuccess(res, log);
}));
