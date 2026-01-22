import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { organizations, users, User } from '../db/schema.js';
import { NotFoundError } from '../errors/index.js';

/**
 * Get current organization
 */
export async function getCurrentOrganization(organizationId: number) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) {
    throw new NotFoundError('Organization');
  }

  return {
    id: org.id,
    name: org.name,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

/**
 * Update organization name
 */
export async function updateOrganization(
  organizationId: number,
  data: { name: string }
) {
  const [updated] = await db
    .update(organizations)
    .set({ name: data.name, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!updated) {
    throw new NotFoundError('Organization');
  }

  return {
    id: updated.id,
    name: updated.name,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * List organization members
 */
export async function listMembers(
  organizationId: number,
  pagination: { page: number; limit: number; offset: number }
) {
  const members = await db.query.users.findMany({
    where: eq(users.organizationId, organizationId),
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: (users, { asc }) => [asc(users.name)],
  });

  const [{ count }] = await db
    .select({ count: users.id })
    .from(users)
    .where(eq(users.organizationId, organizationId));

  const total = Number(count) || members.length;

  return {
    members: members.map(m => ({
      id: m.id,
      email: m.email,
      name: m.name,
      role: m.role,
      createdAt: m.createdAt,
    })),
    total,
  };
}
