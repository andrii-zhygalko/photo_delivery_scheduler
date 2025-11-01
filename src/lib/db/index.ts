import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL environment variable is not set');
}

/**
 * Database client using WebSocket driver (Pool) for transaction support.
 *
 * IMPORTANT: We MUST use the WebSocket driver in ALL environments (including production)
 * because our RLS (Row-Level Security) implementation requires transactions to set
 * the app.user_id GUC before queries.
 *
 * The HTTP driver doesn't support transactions, which would break RLS in production.
 *
 * Neon's serverless WebSocket driver is designed for serverless environments and
 * handles connection pooling automatically.
 */
export const db = drizzleWs(
  new Pool({ connectionString: process.env.NEON_DATABASE_URL }),
  { schema }
);
