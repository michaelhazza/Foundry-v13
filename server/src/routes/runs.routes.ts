import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendNoContent } from '../lib/response.js';
import { parseIntParam } from '../lib/validation.js';
import * as runsService from '../services/runs.service.js';

export const runsRouter = Router();

// All run routes require authentication
runsRouter.use(requireAuth);

/**
 * GET /api/runs/:runId - Get run details
 * @see API Contract endpoint #40
 */
runsRouter.get('/:runId', asyncHandler(async (req, res) => {
  const runId = parseIntParam(req.params.runId, 'runId');
  const run = await runsService.getRun(runId, req.user!.organizationId);
  return sendSuccess(res, run);
}));

/**
 * POST /api/runs/:runId/cancel - Cancel running job
 * @see API Contract endpoint #41
 */
runsRouter.post('/:runId/cancel', asyncHandler(async (req, res) => {
  const runId = parseIntParam(req.params.runId, 'runId');
  await runsService.cancelRun(runId, req.user!.organizationId);
  return sendNoContent(res);
}));

/**
 * GET /api/runs/:runId/status - Get run status (polling)
 * @see API Contract endpoint #42
 */
runsRouter.get('/:runId/status', asyncHandler(async (req, res) => {
  const runId = parseIntParam(req.params.runId, 'runId');
  const status = await runsService.getRunStatus(runId, req.user!.organizationId);
  return sendSuccess(res, status);
}));

/**
 * GET /api/runs/:runId/logs - Get run logs
 * @see API Contract endpoint #43
 */
runsRouter.get('/:runId/logs', asyncHandler(async (req, res) => {
  const runId = parseIntParam(req.params.runId, 'runId');
  const logs = await runsService.getRunLogs(runId, req.user!.organizationId);
  return sendSuccess(res, logs);
}));

/**
 * GET /api/runs/:runId/dataset - Get run output dataset
 * @see API Contract endpoint #44
 */
runsRouter.get('/:runId/dataset', asyncHandler(async (req, res) => {
  const runId = parseIntParam(req.params.runId, 'runId');
  const dataset = await runsService.getRunDataset(runId, req.user!.organizationId);
  return sendSuccess(res, dataset);
}));
