import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendCreated, sendPaginated } from '../lib/response.js';
import { parseIntParam, parsePaginationParams } from '../lib/validation.js';
import * as processingService from '../services/processing.service.js';

export const processingRouter = Router();

// All processing routes require authentication
processingRouter.use(requireAuth);

const updateProcessingConfigSchema = z.object({
  outputFormat: z.enum(['conversational', 'qa', 'json']),
  includeMetadata: z.boolean(),
  chunkSize: z.number().int().min(100).max(10000),
  qualityFilters: z.object({
    minLength: z.number().int().min(0),
    maxLength: z.number().int().min(1),
  }),
});

/**
 * GET /api/projects/:projectId/processing - Get processing config
 * @see API Contract endpoint #36
 */
processingRouter.get('/:projectId/processing', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  const config = await processingService.getProcessingConfig(
    projectId,
    req.user!.organizationId
  );
  return sendSuccess(res, config);
}));

/**
 * PUT /api/projects/:projectId/processing - Update processing config
 * @see API Contract endpoint #37
 */
processingRouter.put('/:projectId/processing', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  const data = updateProcessingConfigSchema.parse(req.body);
  const config = await processingService.updateProcessingConfig(
    projectId,
    req.user!.organizationId,
    data
  );
  return sendSuccess(res, config);
}));

/**
 * POST /api/projects/:projectId/runs - Create processing run
 * @see API Contract endpoint #38
 */
processingRouter.post('/:projectId/runs', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  const run = await processingService.createProcessingRun(
    projectId,
    req.user!.organizationId
  );
  return sendCreated(res, run);
}));

/**
 * GET /api/projects/:projectId/runs - List processing runs
 * @see API Contract endpoint #39
 */
processingRouter.get('/:projectId/runs', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  const pagination = parsePaginationParams(req.query);
  const { runs, total } = await processingService.listProcessingRuns(
    projectId,
    req.user!.organizationId,
    pagination
  );

  return sendPaginated(res, runs, {
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
    totalCount: total,
  });
}));
