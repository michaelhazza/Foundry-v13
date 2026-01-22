import { eq, and, isNull, count, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  projects,
  processingConfigs,
  processingRuns,
  sources,
  datasets,
} from '../db/schema.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

/**
 * Verify project exists and belongs to organization
 */
async function verifyProject(projectId: number, organizationId: number) {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ),
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  return project;
}

/**
 * Get processing config
 */
export async function getProcessingConfig(projectId: number, organizationId: number) {
  await verifyProject(projectId, organizationId);

  const config = await db.query.processingConfigs.findFirst({
    where: eq(processingConfigs.projectId, projectId),
  });

  return {
    config: config?.config || {
      outputFormat: 'conversational',
      includeMetadata: true,
      chunkSize: 1000,
      qualityFilters: { minLength: 10, maxLength: 10000 },
    },
  };
}

/**
 * Update processing config
 */
export async function updateProcessingConfig(
  projectId: number,
  organizationId: number,
  config: {
    outputFormat: 'conversational' | 'qa' | 'json';
    includeMetadata: boolean;
    chunkSize: number;
    qualityFilters: { minLength: number; maxLength: number };
  }
) {
  await verifyProject(projectId, organizationId);

  const existing = await db.query.processingConfigs.findFirst({
    where: eq(processingConfigs.projectId, projectId),
  });

  if (existing) {
    const [updated] = await db
      .update(processingConfigs)
      .set({ config, updatedAt: new Date() })
      .where(eq(processingConfigs.projectId, projectId))
      .returning();
    return { config: updated.config };
  } else {
    const [created] = await db
      .insert(processingConfigs)
      .values({ projectId, config })
      .returning();
    return { config: created.config };
  }
}

/**
 * Create processing run
 */
export async function createProcessingRun(projectId: number, organizationId: number) {
  await verifyProject(projectId, organizationId);

  // Check if there's already a running job
  const existingRun = await db.query.processingRuns.findFirst({
    where: and(
      eq(processingRuns.projectId, projectId),
      eq(processingRuns.status, 'running')
    ),
  });

  if (existingRun) {
    throw new ValidationError('A processing run is already active', { code: 'RUN_ALREADY_RUNNING' });
  }

  // Check if project has sources
  const projectSources = await db.query.sources.findMany({
    where: and(
      eq(sources.projectId, projectId),
      eq(sources.status, 'ready')
    ),
  });

  if (projectSources.length === 0) {
    throw new ValidationError('No ready sources configured for project', { code: 'NO_SOURCES_CONFIGURED' });
  }

  // Get processing config
  const config = await db.query.processingConfigs.findFirst({
    where: eq(processingConfigs.projectId, projectId),
  });

  const [run] = await db
    .insert(processingRuns)
    .values({
      projectId,
      status: 'pending',
      progress: 0,
      config: config?.config || {},
    })
    .returning();

  // Simulate processing (in real app, this would be a background job)
  simulateProcessing(run.id);

  return {
    id: run.id,
    status: run.status,
    progress: run.progress,
    createdAt: run.createdAt,
  };
}

/**
 * Simulate processing (for demo purposes)
 */
async function simulateProcessing(runId: number) {
  // Update to running
  await db
    .update(processingRuns)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(processingRuns.id, runId));

  // Simulate progress
  for (let progress = 10; progress <= 100; progress += 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    await db
      .update(processingRuns)
      .set({ progress })
      .where(eq(processingRuns.id, runId));
  }

  // Complete
  const [completedRun] = await db
    .update(processingRuns)
    .set({
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      stats: {
        totalRecords: 100,
        processedRecords: 100,
        piiDetected: 15,
        piiMasked: 15,
      },
    })
    .where(eq(processingRuns.id, runId))
    .returning();

  // Create dataset
  await db.insert(datasets).values({
    runId,
    name: `Dataset from Run ${runId}`,
    format: 'conversational',
    recordCount: 100,
    stats: {
      totalConversations: 50,
      avgConversationLength: 4.5,
      uniqueSpeakers: 25,
    },
  });
}

/**
 * List processing runs
 */
export async function listProcessingRuns(
  projectId: number,
  organizationId: number,
  pagination: { page: number; limit: number; offset: number }
) {
  await verifyProject(projectId, organizationId);

  const runs = await db.query.processingRuns.findMany({
    where: eq(processingRuns.projectId, projectId),
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: [desc(processingRuns.createdAt)],
  });

  const totalResult = await db
    .select({ count: count() })
    .from(processingRuns)
    .where(eq(processingRuns.projectId, projectId));

  const total = totalResult[0]?.count || 0;

  return {
    runs: runs.map(r => ({
      id: r.id,
      status: r.status,
      progress: r.progress,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    })),
    total,
  };
}
