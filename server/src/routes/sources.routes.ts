import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendCreated, sendNoContent } from '../lib/response.js';
import { parseIntParam } from '../lib/validation.js';
import * as sourcesService from '../services/sources.service.js';

export const sourcesRouter = Router();

// All source routes require authentication
sourcesRouter.use(requireAuth);

const createTeamworkSourceSchema = z.object({
  name: z.string().min(1).max(255),
  projectId: z.number().int().positive(),
  apiKey: z.string().min(1),
  domain: z.string().min(1),
  dataTypes: z.array(z.enum(['tickets', 'conversations'])).min(1),
});

const updateSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

const updateSchemaMappingSchema = z.object({
  mapping: z.record(z.string()),
});

const updateDeidentificationSchema = z.object({
  enabled: z.boolean(),
  fields: z.array(z.object({
    field: z.string(),
    strategy: z.string(),
  })),
  customPatterns: z.array(z.object({
    name: z.string(),
    pattern: z.string(),
  })),
});

/**
 * POST /api/sources/teamwork - Create Teamwork Desk source
 * @see API Contract endpoint #26
 */
sourcesRouter.post('/teamwork', asyncHandler(async (req, res) => {
  const data = createTeamworkSourceSchema.parse(req.body);
  const source = await sourcesService.createTeamworkSource(
    data.projectId,
    req.user!.organizationId,
    data
  );
  return sendCreated(res, source);
}));

/**
 * GET /api/sources/:sourceId - Get source details
 * @see API Contract endpoint #27
 */
sourcesRouter.get('/:sourceId', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const source = await sourcesService.getSource(sourceId, req.user!.organizationId);
  return sendSuccess(res, source);
}));

/**
 * PATCH /api/sources/:sourceId - Update source metadata
 * @see API Contract endpoint #28
 */
sourcesRouter.patch('/:sourceId', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const data = updateSourceSchema.parse(req.body);
  const source = await sourcesService.updateSource(sourceId, req.user!.organizationId, data);
  return sendSuccess(res, source);
}));

/**
 * DELETE /api/sources/:sourceId - Delete source
 * @see API Contract endpoint #29
 */
sourcesRouter.delete('/:sourceId', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  await sourcesService.deleteSource(sourceId, req.user!.organizationId);
  return sendNoContent(res);
}));

/**
 * POST /api/sources/:sourceId/sync - Trigger API sync
 * @see API Contract endpoint #30
 */
sourcesRouter.post('/:sourceId/sync', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const result = await sourcesService.triggerSync(sourceId, req.user!.organizationId);
  return sendSuccess(res, result, 202);
}));

/**
 * GET /api/sources/:sourceId/preview - Get data preview
 * @see API Contract endpoint #31
 */
sourcesRouter.get('/:sourceId/preview', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const preview = await sourcesService.getPreview(sourceId, req.user!.organizationId);
  return sendSuccess(res, preview);
}));

/**
 * GET /api/sources/:sourceId/schema - Get schema mapping
 * @see API Contract endpoint #32
 */
sourcesRouter.get('/:sourceId/schema', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const schema = await sourcesService.getSchemaMapping(sourceId, req.user!.organizationId);
  return sendSuccess(res, schema);
}));

/**
 * PUT /api/sources/:sourceId/schema - Update schema mapping
 * @see API Contract endpoint #33
 */
sourcesRouter.put('/:sourceId/schema', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const data = updateSchemaMappingSchema.parse(req.body);
  const schema = await sourcesService.updateSchemaMapping(
    sourceId,
    req.user!.organizationId,
    data.mapping
  );
  return sendSuccess(res, schema);
}));

/**
 * GET /api/sources/:sourceId/deidentification - Get deidentification config
 * @see API Contract endpoint #34
 */
sourcesRouter.get('/:sourceId/deidentification', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const config = await sourcesService.getDeidentificationConfig(sourceId, req.user!.organizationId);
  return sendSuccess(res, config);
}));

/**
 * PUT /api/sources/:sourceId/deidentification - Update deidentification config
 * @see API Contract endpoint #35
 */
sourcesRouter.put('/:sourceId/deidentification', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const data = updateDeidentificationSchema.parse(req.body);
  const config = await sourcesService.updateDeidentificationConfig(
    sourceId,
    req.user!.organizationId,
    data
  );
  return sendSuccess(res, config);
}));

/**
 * POST /api/sources/:sourceId/detect-schema - Trigger schema detection
 * @see API Contract endpoint #56
 */
sourcesRouter.post('/:sourceId/detect-schema', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const result = await sourcesService.detectSchema(sourceId, req.user!.organizationId);
  return sendSuccess(res, result, 202);
}));

/**
 * POST /api/sources/:sourceId/detect-pii - Trigger PII detection
 * @see API Contract endpoint #57
 */
sourcesRouter.post('/:sourceId/detect-pii', asyncHandler(async (req, res) => {
  const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
  const result = await sourcesService.detectPii(sourceId, req.user!.organizationId);
  return sendSuccess(res, result, 202);
}));
