import { beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Mock next/server globally for all tests (needed for next-auth compatibility)
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: vi.fn((data, init) => ({
        json: () => Promise.resolve(data),
        status: init?.status ?? 200,
      })),
    },
    NextRequest: vi.fn(() => ({})),
  };
});
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

beforeAll(async () => {
  console.log('Running tests...');

  // Clean up any leftover test data from interrupted test runs
  // This prevents data pollution between test runs
  try {
    await db.execute(sql`
      DELETE FROM users
      WHERE email LIKE 'user%@test.com'
         OR email LIKE 'test-%@example.com'
         OR email LIKE '%integration%@test.com'
         OR email LIKE '%no-items%@test.com'
    `);
    console.log('Cleaned up leftover test data');
  } catch (err) {
    console.warn('Failed to clean up test data (this is OK if database is empty):', err);
  }
});

afterAll(async () => {
  // Global teardown if needed
  console.log('Tests complete.');
});
