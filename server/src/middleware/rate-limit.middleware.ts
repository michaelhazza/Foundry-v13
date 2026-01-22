import rateLimit from 'express-rate-limit';
import { config } from '../lib/config.js';

/**
 * Global rate limiter
 * 100 requests per 15 minutes
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      details: {
        retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
      },
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter (stricter)
 * 10 requests per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: 10,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
      details: {
        retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
      },
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
