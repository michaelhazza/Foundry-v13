import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { processingRuns, datasets, projects } from '../db/schema.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

/**
 * Verify run exists and belongs to organization via project
 */
async function verifyRun(runId: number, organizationId: number) {
  const run = await db.query.processingRuns.findFirst({
    where: eq(processingRuns.id, runId),
    with: {
      project: true,
    },
  });

  if (!run || run.project.organizationId !== organizationId) {
    throw new NotFoundError('Processing run');
  }

  return run;
}

/**
 * Get run details
 */
export async function getRun(runId: number, organizationId: number) {
  const run = await verifyRun(runId, organizationId);

  return {
    id: run.id,
    projectId: run.projectId,
    status: run.status,
    progress: run.progress,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    error: run.error,
    errorDetails: run.errorDetails,
    stats: run.stats,
    config: run.config,
    createdAt: run.createdAt,
  };
}

/**
 * Cancel running job
 */
export async function cancelRun(runId: number, organizationId: number) {
  const run = await verifyRun(runId, organizationId);

  if (!['pending', 'running'].includes(run.status)) {
    throw new ValidationError('Run cannot be cancelled', { code: 'RUN_NOT_CANCELLABLE' });
  }

  await db
    .update(processingRuns)
    .set({
      status: 'cancelled',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(processingRuns.id, runId));
}

/**
 * Get run status (for polling)
 */
export async function getRunStatus(runId: number, organizationId: number) {
  const run = await verifyRun(runId, organizationId);

  return {
    id: run.id,
    status: run.status,
    progress: run.progress,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    error: run.error,
  };
}

/**
 * Get run logs
 */
export async function getRunLogs(runId: number, organizationId: number) {
  await verifyRun(runId, organizationId);

  // Simulated logs
  return {
    logs: [
      { timestamp: new Date().toISOString(), level: 'info', message: 'Processing started' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Loading sources...' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Applying schema mapping...' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Detecting PII...' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Applying deidentification...' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Generating output...' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Processing completed' },
    ],
  };
}

/**
 * Get run output dataset
 */
export async function getRunDataset(runId: number, organizationId: number) {
  await verifyRun(runId, organizationId);

  const dataset = await db.query.datasets.findFirst({
    where: eq(datasets.runId, runId),
  });

  if (!dataset) {
    throw new NotFoundError('Dataset');
  }

  return {
    id: dataset.id,
    name: dataset.name,
    format: dataset.format,
    recordCount: dataset.recordCount,
    stats: dataset.stats,
    createdAt: dataset.createdAt,
  };
}
