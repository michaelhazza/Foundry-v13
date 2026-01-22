import { eq, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLogs, users } from '../db/schema.js';
import { NotFoundError } from '../errors/index.js';

/**
 * List audit logs
 */
export async function listAuditLogs(
  organizationId: number,
  pagination: { page: number; limit: number; offset: number }
) {
  const logs = await db.query.auditLogs.findMany({
    where: eq(auditLogs.organizationId, organizationId),
    with: {
      user: {
        columns: { id: true, name: true, email: true },
      },
    },
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: [desc(auditLogs.createdAt)],
  });

  const totalResult = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, organizationId));

  const total = totalResult[0]?.count || 0;

  return {
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      user: log.user ? {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
      } : null,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    })),
    total,
  };
}

/**
 * Get audit log details
 */
export async function getAuditLog(logId: number, organizationId: number) {
  const log = await db.query.auditLogs.findFirst({
    where: eq(auditLogs.id, logId),
    with: {
      user: {
        columns: { id: true, name: true, email: true },
      },
    },
  });

  if (!log || log.organizationId !== organizationId) {
    throw new NotFoundError('Audit log');
  }

  return {
    id: log.id,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    user: log.user ? {
      id: log.user.id,
      name: log.user.name,
      email: log.user.email,
    } : null,
    details: log.details,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  };
}

/**
 * Create audit log entry
 */
export async function createAuditLog(data: {
  organizationId: number;
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const [log] = await db
    .insert(auditLogs)
    .values(data)
    .returning();

  return log;
}
