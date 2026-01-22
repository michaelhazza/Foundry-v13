import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include id
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Request ID middleware
 * Generates unique ID for each request for logging/debugging
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = uuidv4();
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
}
