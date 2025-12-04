import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL environment variable is not set');
}

// WebSocket driver required for RLS transaction support
export const db = drizzleWs(
  new Pool({ connectionString: process.env.NEON_DATABASE_URL }),
  { schema }
);
