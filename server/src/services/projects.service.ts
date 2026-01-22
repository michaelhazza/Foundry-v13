import { eq, and, isNull, sql, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { projects, processingConfigs, sources, processingRuns } from '../db/schema.js';
import { NotFoundError, ConflictError } from '../errors/index.js';

/**
 * Create project
 */
export async function createProject(
  organizationId: number,
  userId: number,
  data: { name: string; description?: string }
) {
  // Check for duplicate name in org
  const existing = await db.query.projects.findFirst({
    where: and(
      eq(projects.name, data.name),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ),
  });

  if (existing) {
    throw new ConflictError('Project with this name already exists', 'PROJECT_NAME_EXISTS');
  }

  return await db.transaction(async (tx) => {
    // Create project
    const [project] = await tx
      .insert(projects)
      .values({
        name: data.name,
        description: data.description || null,
        organizationId,
        createdById: userId,
      })
      .returning();

    // Create default processing config
    await tx.insert(processingConfigs).values({
      projectId: project.id,
      config: {
        outputFormat: 'conversational',
        includeMetadata: true,
        chunkSize: 1000,
        qualityFilters: { minLength: 10, maxLength: 10000 },
      },
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  });
}

/**
 * List projects
 */
export async function listProjects(
  organizationId: number,
  pagination: { page: number; limit: number; offset: number }
) {
  const projectList = await db.query.projects.findMany({
    where: and(
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ),
    with: {
      sources: {
        columns: { id: true },
      },
      processingRuns: {
        columns: { id: true, status: true },
        orderBy: (runs, { desc }) => [desc(runs.createdAt)],
        limit: 1,
      },
    },
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
  });

  const totalResult = await db
    .select({ count: count() })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        isNull(projects.deletedAt)
      )
    );

  const total = totalResult[0]?.count || 0;

  return {
    projects: projectList.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      sourceCount: p.sources.length,
      lastRun: p.processingRuns[0] || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    total,
  };
}

/**
 * Get project by ID
 */
export async function getProject(projectId: number, organizationId: number) {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      isNull(projects.deletedAt)
    ),
    with: {
      sources: true,
      processingConfig: true,
      createdBy: {
        columns: { id: true, name: true },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    sources: project.sources.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
    })),
    processingConfig: project.processingConfig?.config || null,
    createdBy: project.createdBy,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * Update project
 */
export async function updateProject(
  projectId: number,
  organizationId: number,
  data: { name?: string; description?: string }
) {
  // Check project exists and belongs to org
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

  // Check for duplicate name if changing name
  if (data.name && data.name !== project.name) {
    const existing = await db.query.projects.findFirst({
      where: and(
        eq(projects.name, data.name),
        eq(projects.organizationId, organizationId),
        isNull(projects.deletedAt)
      ),
    });

    if (existing) {
      throw new ConflictError('Project with this name already exists', 'PROJECT_NAME_EXISTS');
    }
  }

  const [updated] = await db
    .update(projects)
    .set({
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Soft delete project
 */
export async function deleteProject(projectId: number, organizationId: number) {
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

  await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}
