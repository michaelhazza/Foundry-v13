import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { sendError } from '../lib/response.js';
import { ZodError } from 'zod';

/**
 * Global error handler middleware
 * Catches all errors and formats consistent responses
 * MUST be registered last in middleware chain
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Extract request ID if present
  const requestId = (req as any).id;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    sendError(
      res,
      {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: 422,
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      requestId
    );
    return;
  }

  // Handle custom AppErrors
  if (err instanceof AppError) {
    sendError(
      res,
      {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      },
      requestId
    );
    return;
  }

  // Handle unknown errors as 500
  sendError(
    res,
    {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
      statusCode: 500,
    },
    requestId
  );
}

/**
 * Async handler wrapper
 * Catches promise rejections and passes to error handler
 *
 * @example
 * router.get('/projects', asyncHandler(async (req, res) => {
 *   const projects = await projectService.findAll();
 *   sendSuccess(res, projects);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
