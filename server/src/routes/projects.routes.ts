import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../lib/response.js';
import { parseIntParam, parsePaginationParams } from '../lib/validation.js';
import * as projectsService from '../services/projects.service.js';
import * as sourcesService from '../services/sources.service.js';

export const projectsRouter = Router();

// All project routes require authentication
projectsRouter.use(requireAuth);

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

/**
 * POST /api/projects - Create project
 * @see API Contract endpoint #19
 */
projectsRouter.post('/', asyncHandler(async (req, res) => {
  const data = createProjectSchema.parse(req.body);
  const project = await projectsService.createProject(
    req.user!.organizationId,
    req.user!.userId,
    data
  );
  return sendCreated(res, project);
}));

/**
 * GET /api/projects - List projects
 * @see API Contract endpoint #20
 */
projectsRouter.get('/', asyncHandler(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  const { projects, total } = await projectsService.listProjects(
    req.user!.organizationId,
    pagination
  );

  return sendPaginated(res, projects, {
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
    totalCount: total,
  });
}));

/**
 * GET /api/projects/:projectId - Get project details
 * @see API Contract endpoint #21
 */
projectsRouter.get('/:projectId', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  const project = await projectsService.getProject(projectId, req.user!.organizationId);
  return sendSuccess(res, project);
}));

/**
 * PATCH /api/projects/:projectId - Update project
 * @see API Contract endpoint #22
 */
projectsRouter.patch('/:projectId', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  const data = updateProjectSchema.parse(req.body);
  const project = await projectsService.updateProject(
    projectId,
    req.user!.organizationId,
    data
  );
  return sendSuccess(res, project);
}));

/**
 * DELETE /api/projects/:projectId - Delete project (soft)
 * @see API Contract endpoint #23
 */
projectsRouter.delete('/:projectId', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  await projectsService.deleteProject(projectId, req.user!.organizationId);
  return sendNoContent(res);
}));

/**
 * POST /api/projects/:projectId/sources - Create file source
 * @see API Contract endpoint #24
 */
projectsRouter.post('/:projectId/sources', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  const source = await sourcesService.createFileSource(
    projectId,
    req.user!.organizationId,
    req.body,
    req.file
  );
  return sendCreated(res, source);
}));

/**
 * GET /api/projects/:projectId/sources - List project sources
 * @see API Contract endpoint #25
 */
projectsRouter.get('/:projectId/sources', asyncHandler(async (req, res) => {
  const projectId = parseIntParam(req.params.projectId, 'projectId');
  const pagination = parsePaginationParams(req.query);
  const { sources, total } = await sourcesService.listProjectSources(
    projectId,
    req.user!.organizationId,
    pagination
  );

  return sendPaginated(res, sources, {
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
    totalCount: total,
  });
}));
