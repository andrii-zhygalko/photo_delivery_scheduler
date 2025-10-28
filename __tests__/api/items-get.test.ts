import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createTestUser,
  createTestItems,
  cleanupTestUsers,
} from '../helpers/db';
import { mockSession } from '../helpers/auth';
import * as authModule from '@/lib/auth/session';
import { GET } from '@/app/api/items/route';
import { createMockRequest } from '../helpers/request';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

describe('GET /api/items', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    const user = await createTestUser();
    testUserId = user.userId;
    testEmail = user.email;

    // Create test items
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      await createTestItems(tx, testUserId, 5);
    });
  });

  afterAll(async () => {
    await cleanupTestUsers([testUserId]);
  });

  test('Returns all items for authenticated user', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest('http://localhost:3000/api/items');
    const res = await GET(req);

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.items).toHaveLength(5);
    expect(
      data.items.every((item: { user_id: string }) => item.user_id === testUserId)
    ).toBe(true);

    vi.restoreAllMocks();
  });

  test('Returns empty array when user has no items', async () => {
    // Create new user with no items (unique email to prevent pollution)
    const newUser = await createTestUser({ email: `no-items-${Date.now()}@test.com` });
    const session = mockSession(newUser.userId, newUser.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest('http://localhost:3000/api/items');
    const res = await GET(req);

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.items).toEqual([]);

    await cleanupTestUsers([newUser.userId]);
    vi.restoreAllMocks();
  });

  test('Default sort is by deadline ascending', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest('http://localhost:3000/api/items');
    const res = await GET(req);
    const data = await res.json();

    const deadlines = data.items.map(
      (item: { computed_deadline: string }) =>
        new Date(item.computed_deadline)
    );
    const sortedDeadlines = [...deadlines].sort(
      (a, b) => a.getTime() - b.getTime()
    );

    expect(deadlines.map((d: Date) => d.getTime())).toEqual(
      sortedDeadlines.map((d: Date) => d.getTime())
    );

    vi.restoreAllMocks();
  });

  test('Returns 401 when not authenticated', async () => {
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/items');
    const res = await GET(req);

    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Unauthorized');

    vi.restoreAllMocks();
  });

  test('Returns 400 for invalid query parameters', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      'http://localhost:3000/api/items?status=INVALID'
    );
    const res = await GET(req);

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('Invalid query parameters');

    vi.restoreAllMocks();
  });

  test('Filter by status works correctly', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      'http://localhost:3000/api/items?status=TO_DO'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(
      data.items.every((item: { status: string }) => item.status === 'TO_DO')
    ).toBe(true);

    vi.restoreAllMocks();
  });

  test('Sort by created_at descending works', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      'http://localhost:3000/api/items?sort=created_at&order=desc'
    );
    const res = await GET(req);
    const data = await res.json();

    const timestamps = data.items.map(
      (item: { created_at: string }) => new Date(item.created_at).getTime()
    );

    // Verify descending order
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }

    vi.restoreAllMocks();
  });
});
