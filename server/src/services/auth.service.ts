import { eq, and, gte, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  organizations,
  invitations,
  refreshTokens,
  passwordResets,
  User,
  NewUser,
} from '../db/schema.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  TokenPayload,
} from '../lib/tokens.js';
import {
  UnauthorizedError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../errors/index.js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { addHours, addDays } from 'date-fns';

export interface RegisterData {
  invitationToken: string;
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'member';
    organization: {
      id: number;
      name: string;
    };
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new user with invitation token
 */
export async function register(data: RegisterData): Promise<AuthResult> {
  // Find and validate invitation
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.token, data.invitationToken),
      isNull(invitations.usedAt),
      gte(invitations.expiresAt, new Date())
    ),
    with: {
      organization: true,
    },
  });

  if (!invitation) {
    throw new UnauthorizedError('Invalid or expired invitation', 'INVALID_TOKEN');
  }

  // Verify email matches invitation
  if (invitation.email.toLowerCase() !== data.email.toLowerCase()) {
    throw new BadRequestError('Email does not match invitation');
  }

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email.toLowerCase()),
  });

  if (existingUser) {
    throw new ConflictError('Email already registered', 'DUPLICATE_EMAIL');
  }

  // Hash password and create user
  const passwordHash = await hashPassword(data.password);

  const [user] = await db.transaction(async (tx) => {
    // Create user
    const [newUser] = await tx
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: invitation.role,
        organizationId: invitation.organizationId,
      })
      .returning();

    // Mark invitation as used
    await tx
      .update(invitations)
      .set({ usedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    return [newUser];
  });

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(user.id, tokenPayload);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Login with email and password
 */
export async function login(data: LoginData): Promise<AuthResult> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, data.email.toLowerCase()),
    with: {
      organization: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await verifyPassword(data.password, user.passwordHash);

  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(user.id, tokenPayload);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh tokens using refresh token
 */
export async function refreshTokens(token: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  // Hash the token to find it
  const tokenHash = hashRefreshToken(token);

  const storedToken = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.tokenHash, tokenHash),
      isNull(refreshTokens.usedAt),
      gte(refreshTokens.expiresAt, new Date())
    ),
    with: {
      user: {
        with: {
          organization: true,
        },
      },
    },
  });

  if (!storedToken) {
    throw new UnauthorizedError('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
  }

  // Mark old token as used
  await db
    .update(refreshTokens)
    .set({ usedAt: new Date() })
    .where(eq(refreshTokens.id, storedToken.id));

  // Generate new tokens
  const tokenPayload: TokenPayload = {
    userId: storedToken.user.id,
    organizationId: storedToken.user.organizationId,
    role: storedToken.user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = await createRefreshToken(storedToken.userId, tokenPayload);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 3600, // 1 hour
  };
}

/**
 * Logout - invalidate refresh token
 */
export async function logout(userId: number): Promise<void> {
  // Invalidate all refresh tokens for the user
  await db
    .update(refreshTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.usedAt)
      )
    );
}

/**
 * Get current user profile
 */
export async function getCurrentUser(userId: number): Promise<{
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'member';
  organization: { id: number; name: string };
  createdAt: Date;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      organization: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organization: {
      id: user.organization.id,
      name: user.organization.name,
    },
    createdAt: user.createdAt,
  };
}

/**
 * Update user profile (name only)
 */
export async function updateProfile(
  userId: number,
  data: { name: string }
): Promise<{
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'member';
  organization: { id: number; name: string };
}> {
  const [updated] = await db
    .update(users)
    .set({ name: data.name, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new NotFoundError('User');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      organization: true,
    },
  });

  return {
    id: user!.id,
    email: user!.email,
    name: user!.name,
    role: user!.role,
    organization: {
      id: user!.organization.id,
      name: user!.organization.name,
    },
  };
}

/**
 * Change password
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValid) {
    throw new UnauthorizedError('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  const newHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    // Update password
    await tx
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Invalidate all refresh tokens
    await tx
      .update(refreshTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.usedAt)
        )
      );
  });
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return;
  }

  // Generate reset token
  const token = nanoid(32);
  const tokenHash = hashResetToken(token);

  await db.insert(passwordResets).values({
    userId: user.id,
    tokenHash,
    expiresAt: addHours(new Date(), 1),
  });

  // Log token in development (real apps would send email)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
  }
}

/**
 * Validate password reset token
 */
export async function validateResetToken(token: string): Promise<{
  valid: boolean;
  email: string;
}> {
  const tokenHash = hashResetToken(token);

  const reset = await db.query.passwordResets.findFirst({
    where: and(
      eq(passwordResets.tokenHash, tokenHash),
      isNull(passwordResets.usedAt),
      gte(passwordResets.expiresAt, new Date())
    ),
    with: {
      user: true,
    },
  });

  if (!reset) {
    throw new BadRequestError('Invalid or expired token', { code: 'INVALID_TOKEN' });
  }

  return {
    valid: true,
    email: reset.user.email,
  };
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashResetToken(token);

  const reset = await db.query.passwordResets.findFirst({
    where: and(
      eq(passwordResets.tokenHash, tokenHash),
      isNull(passwordResets.usedAt),
      gte(passwordResets.expiresAt, new Date())
    ),
  });

  if (!reset) {
    throw new BadRequestError('Invalid or expired token', { code: 'INVALID_TOKEN' });
  }

  const newHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    // Update password
    await tx
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, reset.userId));

    // Mark token as used
    await tx
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, reset.id));

    // Invalidate all refresh tokens
    await tx
      .update(refreshTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, reset.userId),
          isNull(refreshTokens.usedAt)
        )
      );
  });
}

// Helper functions
async function createRefreshToken(userId: number, payload: TokenPayload): Promise<string> {
  const token = nanoid(32);
  const tokenHash = hashRefreshToken(token);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt: addDays(new Date(), 7),
  });

  return token;
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
