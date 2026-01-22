import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../lib/response.js';
import { parseIntParam } from '../lib/validation.js';
import * as datasetsService from '../services/datasets.service.js';

export const datasetsRouter = Router();

// All dataset routes require authentication
datasetsRouter.use(requireAuth);

/**
 * GET /api/datasets/:datasetId - Get dataset details
 * @see API Contract endpoint #45
 */
datasetsRouter.get('/:datasetId', asyncHandler(async (req, res) => {
  const datasetId = parseIntParam(req.params.datasetId, 'datasetId');
  const dataset = await datasetsService.getDataset(datasetId, req.user!.organizationId);
  return sendSuccess(res, dataset);
}));

/**
 * GET /api/datasets/:datasetId/preview - Get dataset preview
 * @see API Contract endpoint #46
 */
datasetsRouter.get('/:datasetId/preview', asyncHandler(async (req, res) => {
  const datasetId = parseIntParam(req.params.datasetId, 'datasetId');
  const preview = await datasetsService.getDatasetPreview(datasetId, req.user!.organizationId);
  return sendSuccess(res, preview);
}));

/**
 * GET /api/datasets/:datasetId/export - Export dataset (conversational)
 * @see API Contract endpoint #47
 */
datasetsRouter.get('/:datasetId/export', asyncHandler(async (req, res) => {
  const datasetId = parseIntParam(req.params.datasetId, 'datasetId');
  const exportData = await datasetsService.exportDataset(datasetId, req.user!.organizationId, 'conversational');
  return sendSuccess(res, exportData);
}));

/**
 * GET /api/datasets/:datasetId/export/qa - Export dataset (Q&A pairs)
 * @see API Contract endpoint #48
 */
datasetsRouter.get('/:datasetId/export/qa', asyncHandler(async (req, res) => {
  const datasetId = parseIntParam(req.params.datasetId, 'datasetId');
  const exportData = await datasetsService.exportDataset(datasetId, req.user!.organizationId, 'qa');
  return sendSuccess(res, exportData);
}));

/**
 * GET /api/datasets/:datasetId/export/json - Export dataset (raw JSON)
 * @see API Contract endpoint #49
 */
datasetsRouter.get('/:datasetId/export/json', asyncHandler(async (req, res) => {
  const datasetId = parseIntParam(req.params.datasetId, 'datasetId');
  const exportData = await datasetsService.exportDataset(datasetId, req.user!.organizationId, 'json');
  return sendSuccess(res, exportData);
}));

/**
 * GET /api/datasets/:datasetId/stats - Get dataset statistics
 * @see API Contract endpoint #50
 */
datasetsRouter.get('/:datasetId/stats', asyncHandler(async (req, res) => {
  const datasetId = parseIntParam(req.params.datasetId, 'datasetId');
  const stats = await datasetsService.getDatasetStats(datasetId, req.user!.organizationId);
  return sendSuccess(res, stats);
}));
