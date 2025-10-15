import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import { neon, Pool } from '@neondatabase/serverless';
import * as schema from './schema';

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL environment variable is not set');
}

/**
 * Database client that adapts based on environment:
 * - TEST: Uses WebSocket driver (Pool) for transaction support (needed for RLS tests)
 * - PRODUCTION/DEV: Uses HTTP driver for serverless compatibility (faster, no persistent connections)
 */
const isTest = process.env.NODE_ENV === 'test';

export const db = isTest
  ? drizzleWs(new Pool({ connectionString: process.env.NEON_DATABASE_URL }), {
      schema,
    })
  : drizzleHttp(neon(process.env.NEON_DATABASE_URL), { schema });
