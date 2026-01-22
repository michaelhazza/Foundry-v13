import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { NotFoundError, ForbiddenError } from '../errors/index.js';

/**
 * Verify user exists and belongs to organization
 */
async function verifyUser(userId: number, organizationId: number) {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.id, userId),
      eq(users.organizationId, organizationId)
    ),
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

/**
 * Get user details
 */
export async function getUser(userId: number, organizationId: number) {
  const user = await verifyUser(userId, organizationId);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: number,
  organizationId: number,
  role: 'admin' | 'member',
  currentUserId: number
) {
  const user = await verifyUser(userId, organizationId);

  // Prevent self-demotion
  if (userId === currentUserId) {
    throw new ForbiddenError('Cannot change your own role');
  }

  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
  };
}

/**
 * Remove user from organization
 */
export async function removeUser(
  userId: number,
  organizationId: number,
  currentUserId: number
) {
  const user = await verifyUser(userId, organizationId);

  // Prevent self-removal
  if (userId === currentUserId) {
    throw new ForbiddenError('Cannot remove yourself from the organization');
  }

  await db.delete(users).where(eq(users.id, userId));
}
