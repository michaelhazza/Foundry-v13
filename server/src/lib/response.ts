import { Response } from 'express';

/**
 * Send successful response with data
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): Response {
  return res.status(statusCode).json({
    data,
  });
}

/**
 * Send created response (201)
 */
export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

/**
 * Send no content response (204)
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Send paginated response with meta
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  }
): Response {
  return res.status(200).json({
    data,
    meta: {
      pagination: {
        ...meta,
        hasNextPage: meta.page < meta.totalPages,
      },
    },
  });
}

/**
 * Send error response
 * Should only be used by error handler middleware
 */
export function sendError(
  res: Response,
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  },
  requestId?: string
): Response {
  return res.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  });
}
