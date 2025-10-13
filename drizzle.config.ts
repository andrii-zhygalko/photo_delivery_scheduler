import type { Config } from 'drizzle-kit';
import './envConfig.ts';

export default {
  schema: './src/lib/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL!,
  },
} satisfies Config;
