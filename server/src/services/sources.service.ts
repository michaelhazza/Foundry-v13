import { eq, and, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  sources,
  projects,
  schemaMappings,
  deidentificationConfigs,
} from '../db/schema.js';
import { NotFoundError, BadRequestError, ValidationError } from '../errors/index.js';
import { encrypt, decrypt } from '../lib/encryption.js';

/**
 * Verify project exists and belongs to organization
 */
async function verifyProject(projectId: number, organizationId: number) {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId)
    ),
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  return project;
}

/**
 * Verify source exists and belongs to organization via project
 */
async function verifySource(sourceId: number, organizationId: number) {
  const source = await db.query.sources.findFirst({
    where: eq(sources.id, sourceId),
    with: {
      project: true,
    },
  });

  if (!source || source.project.organizationId !== organizationId) {
    throw new NotFoundError('Source');
  }

  return source;
}

/**
 * Create file source
 */
export async function createFileSource(
  projectId: number,
  organizationId: number,
  data: { name: string; fileName?: string; fileType?: string },
  file?: any
) {
  await verifyProject(projectId, organizationId);

  const [source] = await db.transaction(async (tx) => {
    const [newSource] = await tx
      .insert(sources)
      .values({
        name: data.name || data.fileName || 'Unnamed Source',
        type: 'file',
        status: 'pending',
        projectId,
        fileName: data.fileName,
        fileType: data.fileType,
      })
      .returning();

    // Create empty schema mapping
    await tx.insert(schemaMappings).values({
      sourceId: newSource.id,
      mapping: {},
    });

    // Create empty deidentification config
    await tx.insert(deidentificationConfigs).values({
      sourceId: newSource.id,
      config: {
        enabled: false,
        fields: [],
        customPatterns: [],
      },
    });

    return [newSource];
  });

  return {
    id: source.id,
    name: source.name,
    type: source.type,
    status: source.status,
    fileName: source.fileName,
    fileType: source.fileType,
    createdAt: source.createdAt,
  };
}

/**
 * Create Teamwork Desk source
 */
export async function createTeamworkSource(
  projectId: number,
  organizationId: number,
  data: {
    name: string;
    apiKey: string;
    domain: string;
    dataTypes: string[];
  }
) {
  await verifyProject(projectId, organizationId);

  // Encrypt API key
  const encryptedApiKey = encrypt(data.apiKey);

  const [source] = await db.transaction(async (tx) => {
    const [newSource] = await tx
      .insert(sources)
      .values({
        name: data.name,
        type: 'teamwork',
        status: 'pending',
        projectId,
        teamworkApiKey: encryptedApiKey,
        teamworkDomain: data.domain,
        teamworkDataTypes: data.dataTypes,
      })
      .returning();

    // Create empty schema mapping
    await tx.insert(schemaMappings).values({
      sourceId: newSource.id,
      mapping: {},
    });

    // Create empty deidentification config
    await tx.insert(deidentificationConfigs).values({
      sourceId: newSource.id,
      config: {
        enabled: false,
        fields: [],
        customPatterns: [],
      },
    });

    return [newSource];
  });

  return {
    id: source.id,
    name: source.name,
    type: source.type,
    status: source.status,
    domain: source.teamworkDomain,
    dataTypes: source.teamworkDataTypes,
    createdAt: source.createdAt,
  };
}

/**
 * List project sources
 */
export async function listProjectSources(
  projectId: number,
  organizationId: number,
  pagination: { page: number; limit: number; offset: number }
) {
  await verifyProject(projectId, organizationId);

  const sourceList = await db.query.sources.findMany({
    where: eq(sources.projectId, projectId),
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: (sources, { desc }) => [desc(sources.createdAt)],
  });

  const totalResult = await db
    .select({ count: count() })
    .from(sources)
    .where(eq(sources.projectId, projectId));

  const total = totalResult[0]?.count || 0;

  return {
    sources: sourceList.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      recordCount: s.recordCount,
      lastSyncAt: s.lastSyncAt,
      createdAt: s.createdAt,
    })),
    total,
  };
}

/**
 * Get source details
 */
export async function getSource(sourceId: number, organizationId: number) {
  const source = await verifySource(sourceId, organizationId);

  return {
    id: source.id,
    name: source.name,
    type: source.type,
    status: source.status,
    projectId: source.projectId,
    fileName: source.fileName,
    fileType: source.fileType,
    fileSize: source.fileSize,
    domain: source.teamworkDomain,
    dataTypes: source.teamworkDataTypes,
    recordCount: source.recordCount,
    lastSyncAt: source.lastSyncAt,
    syncError: source.syncError,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

/**
 * Update source metadata
 */
export async function updateSource(
  sourceId: number,
  organizationId: number,
  data: { name?: string }
) {
  await verifySource(sourceId, organizationId);

  const [updated] = await db
    .update(sources)
    .set({
      ...(data.name && { name: data.name }),
      updatedAt: new Date(),
    })
    .where(eq(sources.id, sourceId))
    .returning();

  return {
    id: updated.id,
    name: updated.name,
    type: updated.type,
    status: updated.status,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Delete source
 */
export async function deleteSource(sourceId: number, organizationId: number) {
  await verifySource(sourceId, organizationId);
  await db.delete(sources).where(eq(sources.id, sourceId));
}

/**
 * Trigger sync for API source
 */
export async function triggerSync(sourceId: number, organizationId: number) {
  const source = await verifySource(sourceId, organizationId);

  if (source.type !== 'teamwork') {
    throw new BadRequestError('Only Teamwork sources can be synced');
  }

  // Update status to syncing
  await db
    .update(sources)
    .set({ status: 'syncing', updatedAt: new Date() })
    .where(eq(sources.id, sourceId));

  // In a real app, this would trigger a background job
  // For now, we'll simulate immediate completion
  setTimeout(async () => {
    await db
      .update(sources)
      .set({
        status: 'ready',
        lastSyncAt: new Date(),
        recordCount: 100, // Simulated
        updatedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));
  }, 2000);

  return { message: 'Sync started' };
}

/**
 * Get data preview
 */
export async function getPreview(sourceId: number, organizationId: number) {
  const source = await verifySource(sourceId, organizationId);

  // Return cached data or sample
  return {
    columns: ['id', 'content', 'author', 'timestamp'],
    rows: source.cachedData
      ? (source.cachedData as any[]).slice(0, 10)
      : [
          { id: 1, content: 'Sample message', author: 'User 1', timestamp: new Date().toISOString() },
          { id: 2, content: 'Another message', author: 'User 2', timestamp: new Date().toISOString() },
        ],
    totalRows: source.recordCount || 2,
  };
}

/**
 * Get schema mapping
 */
export async function getSchemaMapping(sourceId: number, organizationId: number) {
  await verifySource(sourceId, organizationId);

  const mapping = await db.query.schemaMappings.findFirst({
    where: eq(schemaMappings.sourceId, sourceId),
  });

  return {
    mapping: mapping?.mapping || {},
    detectedSchema: mapping?.detectedSchema || {},
  };
}

/**
 * Update schema mapping
 */
export async function updateSchemaMapping(
  sourceId: number,
  organizationId: number,
  mapping: Record<string, string>
) {
  await verifySource(sourceId, organizationId);

  const [updated] = await db
    .update(schemaMappings)
    .set({ mapping, updatedAt: new Date() })
    .where(eq(schemaMappings.sourceId, sourceId))
    .returning();

  return { mapping: updated.mapping };
}

/**
 * Get deidentification config
 */
export async function getDeidentificationConfig(sourceId: number, organizationId: number) {
  await verifySource(sourceId, organizationId);

  const config = await db.query.deidentificationConfigs.findFirst({
    where: eq(deidentificationConfigs.sourceId, sourceId),
  });

  return {
    config: config?.config || { enabled: false, fields: [], customPatterns: [] },
    detectedPii: config?.detectedPii || [],
  };
}

/**
 * Update deidentification config
 */
export async function updateDeidentificationConfig(
  sourceId: number,
  organizationId: number,
  config: {
    enabled: boolean;
    fields: { field: string; strategy: string }[];
    customPatterns: { name: string; pattern: string }[];
  }
) {
  await verifySource(sourceId, organizationId);

  const [updated] = await db
    .update(deidentificationConfigs)
    .set({ config, updatedAt: new Date() })
    .where(eq(deidentificationConfigs.sourceId, sourceId))
    .returning();

  return { config: updated.config };
}

/**
 * Trigger schema detection
 */
export async function detectSchema(sourceId: number, organizationId: number) {
  await verifySource(sourceId, organizationId);

  // Simulate schema detection
  const detectedSchema = {
    id: 'integer',
    content: 'text',
    author: 'string',
    timestamp: 'datetime',
    metadata: 'json',
  };

  await db
    .update(schemaMappings)
    .set({ detectedSchema, updatedAt: new Date() })
    .where(eq(schemaMappings.sourceId, sourceId));

  return { detectedSchema };
}

/**
 * Trigger PII detection
 */
export async function detectPii(sourceId: number, organizationId: number) {
  await verifySource(sourceId, organizationId);

  // Simulate PII detection
  const detectedPii = [
    { field: 'author', type: 'name', confidence: 0.95 },
    { field: 'content', type: 'email', confidence: 0.85 },
  ];

  await db
    .update(deidentificationConfigs)
    .set({ detectedPii, updatedAt: new Date() })
    .where(eq(deidentificationConfigs.sourceId, sourceId));

  return { detectedPii };
}
