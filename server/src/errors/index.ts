/**
 * Base application error class
 * All custom errors extend this
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request errors
 * Use for: invalid input, validation failures
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

/**
 * 401 Unauthorized errors
 * Use for: missing/invalid authentication
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

/**
 * 403 Forbidden errors
 * Use for: authenticated but insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(403, code, message);
  }
}

/**
 * 404 Not Found errors
 * Use for: resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

/**
 * 409 Conflict errors
 * Use for: duplicate resources, concurrent updates
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code: string = 'CONFLICT') {
    super(409, code, message);
  }
}

/**
 * 422 Unprocessable Entity errors
 * Use for: semantic validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

/**
 * 429 Too Many Requests errors
 * Use for: rate limiting
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, 'RATE_LIMIT_EXCEEDED', message);
  }
}

/**
 * 500 Internal Server Error
 * Use for: unexpected errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, 'INTERNAL_ERROR', message);
  }
}

/**
 * 503 Service Unavailable errors
 * Use for: external service failures
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string = 'Service') {
    super(503, 'SERVICE_UNAVAILABLE', `${service} is currently unavailable`);
  }
}
