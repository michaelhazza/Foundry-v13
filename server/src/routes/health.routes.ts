import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export const healthRouter = Router();

const startTime = Date.now();

/**
 * GET /api/health - Health check
 * @see API Contract endpoint #1
 */
healthRouter.get('/health', async (req, res, next) => {
  try {
    // Check database connection
    let databaseStatus = 'connected';
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      databaseStatus = 'disconnected';
    }

    const uptime = Math.floor((Date.now() - startTime) / 1000);

    return sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: databaseStatus,
      uptime,
    });
  } catch (error) {
    next(error);
  }
});
