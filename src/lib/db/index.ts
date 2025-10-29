import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import { neon, Pool } from '@neondatabase/serverless';
import * as schema from './schema';

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL environment variable is not set');
}

/**
 * Database client that adapts based on environment:
 * - TEST/DEVELOPMENT: Uses WebSocket driver (Pool) for transaction support (needed for RLS)
 * - PRODUCTION: Uses HTTP driver for serverless compatibility (faster, no persistent connections)
 *
 * Why? The HTTP driver doesn't support transactions, which are required for setting
 * the app.user_id GUC that enables Row-Level Security policies.
 */
const useTransactionDriver =
  process.env.NODE_ENV === 'test' ||
  process.env.NODE_ENV === 'development';

export const db = useTransactionDriver
  ? drizzleWs(new Pool({ connectionString: process.env.NEON_DATABASE_URL }), {
      schema,
    })
  : drizzleHttp(neon(process.env.NEON_DATABASE_URL), { schema });
