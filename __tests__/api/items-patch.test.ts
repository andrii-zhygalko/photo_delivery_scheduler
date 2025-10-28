import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createTestUser,
  createTestItems,
  cleanupTestUsers,
} from '../helpers/db';
import { mockSession } from '../helpers/auth';
import * as authModule from '@/lib/auth/session';
import { PATCH } from '@/app/api/items/[id]/route';
import { GET } from '@/app/api/items/[id]/route';
import { createMockRequest } from '../helpers/request';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

describe('PATCH /api/items/[id]', () => {
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

  test('Updates client_name only (partial update)', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          client_name: 'Updated Client Name',
        }),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.item.client_name).toBe('Updated Client Name');

    vi.restoreAllMocks();
  });

  test('Updates status to EDITING', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'EDITING',
        }),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.item.status).toBe('EDITING');

    vi.restoreAllMocks();
  });

  test('Setting status to DELIVERED sets delivered_at timestamp', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'DELIVERED',
        }),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.item.status).toBe('DELIVERED');
    expect(data.item.delivered_at).not.toBeNull();
    expect(new Date(data.item.delivered_at).getTime()).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  test('Updates multiple fields at once', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          client_name: 'Multi-Update Client',
          notes: 'Updated notes',
          status: 'ARCHIVED',
        }),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.item.client_name).toBe('Multi-Update Client');
    expect(data.item.notes).toBe('Updated notes');
    expect(data.item.status).toBe('ARCHIVED');

    vi.restoreAllMocks();
  });

  test('Updates updated_at timestamp on every update', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // Get current updated_at
    const getReq = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`
    );
    const getRes = await GET(getReq, {
      params: Promise.resolve({ id: testItemId }),
    });
    const beforeData = await getRes.json();
    const updatedAtBefore = new Date(beforeData.item.updated_at);

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Update the item
    const patchReq = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          notes: 'Timestamp test',
        }),
      }
    );

    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: testItemId }),
    });
    const afterData = await patchRes.json();
    const updatedAtAfter = new Date(afterData.item.updated_at);

    expect(updatedAtAfter.getTime()).toBeGreaterThan(updatedAtBefore.getTime());

    vi.restoreAllMocks();
  });

  test('Returns 400 for invalid status value', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'INVALID_STATUS',
        }),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(400);

    vi.restoreAllMocks();
  });

  test('Returns 400 for empty client_name', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          client_name: '',
        }),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(400);

    vi.restoreAllMocks();
  });

  test('Returns 404 for non-existent item', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const req = createMockRequest(`http://localhost:3000/api/items/${fakeId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        client_name: 'Test',
      }),
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: fakeId }),
    });

    expect(res.status).toBe(404);

    vi.restoreAllMocks();
  });

  test('Returns 404 when trying to update another user\'s item (RLS)', async () => {
    // Create second user with unique email
    const user2 = await createTestUser({ email: `user2-patch-${Date.now()}@test.com` });

    // Try to update first user's item as second user
    const session2 = mockSession(user2.userId, user2.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session2);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          client_name: 'Hacked',
        }),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    // Should return 404 (RLS blocks it)
    expect(res.status).toBe(404);

    await cleanupTestUsers([user2.userId]);
    vi.restoreAllMocks();
  });

  test('Returns 401 when not authenticated', async () => {
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(null);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          client_name: 'Test',
        }),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    expect(res.status).toBe(401);

    vi.restoreAllMocks();
  });

  test('Empty update body is valid (all fields optional)', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${testItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({}),
      }
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: testItemId }),
    });

    // Should succeed (just updates updated_at)
    expect(res.status).toBe(200);

    vi.restoreAllMocks();
  });
});
