import { beforeAll, afterAll, vi } from 'vitest';
// Mock next/server globally for all tests (needed for next-auth compatibility)
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: vi.fn(data => ({ json: () => Promise.resolve(data) })),
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
  // Global setup if needed
  console.log('Running tests...');
});
afterAll(async () => {
  // Global teardown if needed
  console.log('Tests complete.');
});
