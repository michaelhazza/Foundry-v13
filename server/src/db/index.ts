import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Add it to your .env file or Replit Secrets.'
  );
}

/**
 * PostgreSQL connection using postgres-js
 *
 * CRITICAL: Must use postgres-js driver (not node-postgres)
 * Replit compatibility requires this specific driver
 */
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Drizzle ORM instance
 * Provides type-safe database operations
 */
export const db = drizzle(queryClient, { schema });

/**
 * Close database connection
 * Should be called on graceful shutdown
 */
export async function closeDatabase(): Promise<void> {
  await queryClient.end();
}
