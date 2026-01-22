import jwt, { JwtPayload } from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/index.js';
import { config } from './config.js';

export interface TokenPayload {
  userId: number;
  organizationId: number;
  role: 'admin' | 'member';
}

/**
 * Generate JWT access token
 * Expires in 1 hour by default
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Generate JWT refresh token
 * Expires in 7 days by default
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });
}

/**
 * Verify and decode access token
 * Throws UnauthorizedError if invalid
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload & TokenPayload;
    return {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid token', 'INVALID_TOKEN');
  }
}

/**
 * Verify and decode refresh token
 * Throws UnauthorizedError if invalid
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret) as JwtPayload & TokenPayload;
    return {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
  }
}

/**
 * Extract token from Authorization header
 * Returns null if not present or malformed
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
