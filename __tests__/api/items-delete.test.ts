import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createTestUser,
  createTestItems,
  cleanupTestUsers,
} from '../helpers/db';
import { mockSession } from '../helpers/auth';
import * as authModule from '@/lib/auth/session';
import { DELETE } from '@/app/api/items/[id]/route';
import { GET } from '@/app/api/items/[id]/route';
import { GET as GetAll } from '@/app/api/items/route';
import { createMockRequest } from '../helpers/request';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// TODO: Fix NextRequest compatibility - request.url is undefined, causing URL parsing errors
describe.skip('DELETE /api/items/[id]', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    const user = await createTestUser();
    testUserId = user.userId;
    testEmail = user.email;
  });

  afterAll(async () => {
    await cleanupTestUsers([testUserId]);
  });

  test('Deletes item successfully', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // Create an item to delete
    const items = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return await createTestItems(tx, testUserId, 1);
    });
    const itemId = items[0].id;

    // Delete the item
    const req = createMockRequest(`http://localhost:3000/api/items/${itemId}`);
    const res = await DELETE(req, {
      params: Promise.resolve({ id: itemId }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toBe('Item deleted successfully');
    expect(data.item.id).toBe(itemId);

    vi.restoreAllMocks();
  });

  test('Item no longer exists after deletion', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // Create an item to delete
    const items = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return await createTestItems(tx, testUserId, 1);
    });
    const itemId = items[0].id;

    // Delete the item
    const deleteReq = createMockRequest(
      `http://localhost:3000/api/items/${itemId}`
    );
    await DELETE(deleteReq, {
      params: Promise.resolve({ id: itemId }),
    });

    // Try to fetch the deleted item
    const getReq = createMockRequest(`http://localhost:3000/api/items/${itemId}`);
    const getRes = await GET(getReq, {
      params: Promise.resolve({ id: itemId }),
    });

    expect(getRes.status).toBe(404);

    vi.restoreAllMocks();
  });

  test('Deleted item not in list', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // Create items
    const items = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return await createTestItems(tx, testUserId, 3);
    });
    const itemToDelete = items[0].id;

    // Delete one item
    const deleteReq = createMockRequest(
      `http://localhost:3000/api/items/${itemToDelete}`
    );
    await DELETE(deleteReq, {
      params: Promise.resolve({ id: itemToDelete }),
    });

    // Get all items
    const listReq = createMockRequest('http://localhost:3000/api/items');
    const listRes = await GetAll(listReq);
    const listData = await listRes.json();

    // Verify deleted item is not in the list
    const deletedItemInList = listData.items.find(
      (item: { id: string }) => item.id === itemToDelete
    );
    expect(deletedItemInList).toBeUndefined();

    // Verify other items still exist
    expect(listData.items.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  test('Returns 404 for non-existent item', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const req = createMockRequest(`http://localhost:3000/api/items/${fakeId}`);
    const res = await DELETE(req, {
      params: Promise.resolve({ id: fakeId }),
    });

    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe('Item not found');

    vi.restoreAllMocks();
  });

  test('Returns 404 when trying to delete another user\'s item (RLS)', async () => {
    // Create second user with unique email
    const user2 = await createTestUser({ email: `user2-delete-${Date.now()}@test.com` });

    // User 1 creates an item
    const session1 = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session1);

    const items = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return await createTestItems(tx, testUserId, 1);
    });
    const user1ItemId = items[0].id;

    // User 2 tries to delete User 1's item
    const session2 = mockSession(user2.userId, user2.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session2);

    const req = createMockRequest(
      `http://localhost:3000/api/items/${user1ItemId}`
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: user1ItemId }),
    });

    // Should return 404 (RLS blocks it)
    expect(res.status).toBe(404);

    // Verify User 1's item still exists
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session1);
    const verifyReq = createMockRequest(
      `http://localhost:3000/api/items/${user1ItemId}`
    );
    const verifyRes = await GET(verifyReq, {
      params: Promise.resolve({ id: user1ItemId }),
    });
    expect(verifyRes.status).toBe(200);

    await cleanupTestUsers([user2.userId]);
    vi.restoreAllMocks();
  });

  test('Returns 401 when not authenticated', async () => {
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(null);

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const req = createMockRequest(`http://localhost:3000/api/items/${fakeId}`);
    const res = await DELETE(req, {
      params: Promise.resolve({ id: fakeId }),
    });

    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Unauthorized');

    vi.restoreAllMocks();
  });

  test('Returns deleted item data in response', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // Create an item to delete
    const items = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return await createTestItems(tx, testUserId, 1);
    });
    const itemId = items[0].id;
    const originalClientName = items[0].client_name;

    // Delete the item
    const req = createMockRequest(`http://localhost:3000/api/items/${itemId}`);
    const res = await DELETE(req, {
      params: Promise.resolve({ id: itemId }),
    });

    const data = await res.json();

    // Verify response includes the deleted item's data
    expect(data.item).toBeDefined();
    expect(data.item.id).toBe(itemId);
    expect(data.item.client_name).toBe(originalClientName);

    vi.restoreAllMocks();
  });
});
