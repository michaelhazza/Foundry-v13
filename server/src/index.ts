import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './lib/config.js';
import { requestId } from './middleware/request-id.middleware.js';
import { globalRateLimiter } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error-handler.js';
import { closeDatabase } from './db/index.js';

// Routes
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { organizationsRouter } from './routes/organizations.routes.js';
import { invitationsRouter } from './routes/invitations.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { sourcesRouter } from './routes/sources.routes.js';
import { processingRouter } from './routes/processing.routes.js';
import { runsRouter } from './routes/runs.routes.js';
import { datasetsRouter } from './routes/datasets.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { auditRouter } from './routes/audit.routes.js';

const app = express();

// Trust proxy for rate limiting (Replit requirement)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin === '*' ? true : config.corsOrigin,
  credentials: true,
}));

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID for tracking
app.use(requestId);

// Rate limiting (except health check)
app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  return globalRateLimiter(req, res, next);
});

// API Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/projects', processingRouter);
app.use('/api/runs', runsRouter);
app.use('/api/datasets', datasetsRouter);
app.use('/api/users', usersRouter);
app.use('/api/audit-logs', auditRouter);

// Serve static files in production
if (config.isProduction) {
  const path = await import('path');
  const staticPath = path.join(process.cwd(), 'client', 'dist');
  app.use(express.static(staticPath));

  // SPA fallback
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Global error handler (MUST be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed');
    await closeDatabase();
    console.log('Database connection closed');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
