import { BadRequestError } from '../errors/index.js';

/**
 * Parse integer URL parameter with validation
 * Throws BadRequestError if invalid
 *
 * @example
 * const projectId = parseIntParam(req.params.projectId, 'projectId');
 */
export function parseIntParam(value: string, paramName: string): number {
  const parsed = parseInt(value, 10);

  if (isNaN(parsed) || parsed <= 0) {
    throw new BadRequestError(`Invalid ${paramName}: must be a positive integer`);
  }

  return parsed;
}

/**
 * Parse pagination query parameters
 * Returns validated page and limit with defaults
 *
 * @example
 * const { page, limit, offset } = parsePaginationParams(req.query);
 */
export function parsePaginationParams(query: any): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = query.page ? parseInt(query.page as string, 10) : 1;
  const limit = query.limit ? parseInt(query.limit as string, 10) : 20;

  if (isNaN(page) || page < 1) {
    throw new BadRequestError('Invalid page: must be a positive integer');
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new BadRequestError('Invalid limit: must be between 1 and 100');
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Parse optional query integer with validation
 * Returns null if not provided or invalid
 */
export function parseQueryInt(value: any): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value as string, 10);
  return isNaN(parsed) ? null : parsed;
}
