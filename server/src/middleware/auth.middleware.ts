import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import { verifyAccessToken, extractBearerToken, TokenPayload } from '../lib/tokens.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Require authentication middleware
 * Validates JWT Bearer token and attaches user to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if valid token present, but doesn't fail if missing
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}

/**
 * Require admin role middleware
 * Must be used after requireAuth
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin role required', 'ADMIN_REQUIRED'));
  }

  next();
}
