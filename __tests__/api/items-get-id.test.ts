import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createTestUser,
  createTestItems,
  cleanupTestUsers,
} from '../helpers/db';
import { mockSession } from '../helpers/auth';
import * as authModule from '@/lib/auth/session';
import { GET } from '@/app/api/items/[id]/route';
import { createMockRequest } from '../helpers/request';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

describe('GET /api/items/[id]', () => {
  let testUserId: string;
  let testEmail: string;
  let testItemId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    testUserId = user.userId;
    testEmail = user.email;

    // Create test items
    const items = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return await createTestItems(tx, testUserId, 3);
    });

    testItemId = items[0].id;
  });

  afterAll(async () => {
    await cleanupTestUsers([testUserId]);
  });

  test('Returns item by ID for authenticated user', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.item.id).toBe(testItemId);
    expect(data.item.user_id).toBe(testUserId);
    expect(data.item.client_name).toBeDefined();

    vi.restoreAllMocks();
  });

  test('Returns 404 for non-existent item ID', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const req = createMockRequest(`http://localhost:3000/api/items/${fakeId}`);
    const res = await GET(req, {
      params: Promise.resolve({ id: fakeId }),
    });

    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe('Item not found');

    vi.restoreAllMocks();
  });

  test('Returns 404 for another user\'s item (RLS enforcement)', async () => {
    // Create second user
    const user2 = await createTestUser({ email: 'user2@test.com' });

    // Try to access first user's item as second user
    const session2 = mockSession(user2.userId, user2.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session2);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    // Should return 404 (RLS blocks it, not 403)
    expect(res.status).toBe(404);

    await cleanupTestUsers([user2.userId]);
    vi.restoreAllMocks();
  });

  test('Returns 401 when not authenticated', async () => {
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(null);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Unauthorized');

    vi.restoreAllMocks();
  });

  test('Returns complete item object with all fields', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    const data = await res.json();
    const item = data.item;

    // Verify all required fields are present
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('user_id');
    expect(item).toHaveProperty('client_name');
    expect(item).toHaveProperty('shoot_date');
    expect(item).toHaveProperty('computed_deadline');
    expect(item).toHaveProperty('custom_deadline');
    expect(item).toHaveProperty('notes');
    expect(item).toHaveProperty('status');
    expect(item).toHaveProperty('delivered_at');
    expect(item).toHaveProperty('created_at');
    expect(item).toHaveProperty('updated_at');

    vi.restoreAllMocks();
  });
});
