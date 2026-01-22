import { eq, and, isNull, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invitations, users, organizations } from '../db/schema.js';
import { NotFoundError, ConflictError, UnauthorizedError } from '../errors/index.js';
import { nanoid } from 'nanoid';
import { addDays } from 'date-fns';

/**
 * Create invitation
 */
export async function createInvitation(
  organizationId: number,
  invitedById: number,
  data: { email: string; role: 'admin' | 'member' }
) {
  // Check if user already exists in org
  const existingUser = await db.query.users.findFirst({
    where: and(
      eq(users.email, data.email.toLowerCase()),
      eq(users.organizationId, organizationId)
    ),
  });

  if (existingUser) {
    throw new ConflictError('User is already a member of this organization');
  }

  // Check if pending invitation exists
  const existingInvitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.email, data.email.toLowerCase()),
      eq(invitations.organizationId, organizationId),
      isNull(invitations.usedAt),
      gte(invitations.expiresAt, new Date())
    ),
  });

  if (existingInvitation) {
    throw new ConflictError('Pending invitation already exists for this email');
  }

  const token = nanoid(32);

  const [invitation] = await db
    .insert(invitations)
    .values({
      email: data.email.toLowerCase(),
      token,
      role: data.role,
      organizationId,
      invitedById,
      expiresAt: addDays(new Date(), 7),
    })
    .returning();

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    organization: {
      id: org!.id,
      name: org!.name,
    },
    createdAt: invitation.createdAt,
  };
}

/**
 * List pending invitations
 */
export async function listInvitations(
  organizationId: number,
  pagination: { page: number; limit: number; offset: number }
) {
  const invites = await db.query.invitations.findMany({
    where: and(
      eq(invitations.organizationId, organizationId),
      isNull(invitations.usedAt),
      gte(invitations.expiresAt, new Date())
    ),
    with: {
      invitedBy: true,
    },
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
  });

  const [{ count }] = await db
    .select({ count: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        isNull(invitations.usedAt),
        gte(invitations.expiresAt, new Date())
      )
    );

  const total = Number(count) || invites.length;

  return {
    invitations: invites.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      invitedBy: {
        id: inv.invitedBy.id,
        name: inv.invitedBy.name,
      },
      createdAt: inv.createdAt,
    })),
    total,
  };
}

/**
 * Get invitation details by ID or token
 */
export async function getInvitation(invitationId: number) {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
    with: {
      organization: true,
    },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation');
  }

  // Check if expired or used
  if (invitation.usedAt) {
    throw new UnauthorizedError('Invitation has already been used', 'INVITATION_USED');
  }

  if (invitation.expiresAt < new Date()) {
    throw new UnauthorizedError('Invitation has expired', 'INVITATION_EXPIRED');
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organization: {
      id: invitation.organization.id,
      name: invitation.organization.name,
    },
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(invitationId: number, organizationId: number) {
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.id, invitationId),
      eq(invitations.organizationId, organizationId)
    ),
  });

  if (!invitation) {
    throw new NotFoundError('Invitation');
  }

  await db.delete(invitations).where(eq(invitations.id, invitationId));
}
