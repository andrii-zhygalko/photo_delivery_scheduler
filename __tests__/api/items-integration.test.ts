import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestUser, cleanupTestUsers } from '../helpers/db';
import { mockSession } from '../helpers/auth';
import * as authModule from '@/lib/auth/session';
import { GET, POST } from '@/app/api/items/route';
import { GET as GetById, PATCH, DELETE } from '@/app/api/items/[id]/route';
import { createMockRequest } from '../helpers/request';

describe('Items API Integration Tests', () => {
  let user1: { userId: string; email: string; name: string };
  let user2: { userId: string; email: string; name: string };

  beforeAll(async () => {
    // Create two test users for RLS testing with unique emails
    const timestamp = Date.now();
    user1 = await createTestUser({ email: `integration-user1-${timestamp}@test.com` });
    user2 = await createTestUser({ email: `integration-user2-${timestamp}@test.com` });
  });

  afterAll(async () => {
    await cleanupTestUsers([user1.userId, user2.userId]);
  });

  test('Complete CRUD workflow', async () => {
    // Mock session for user1
    const session = mockSession(user1.userId, user1.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // 1. Create item
    const createReq = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: {
        client_name: 'Integration Test Client',
        shoot_date: '2025-10-25',
        notes: 'Test notes for integration workflow',
      },
    });

    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);

    const createData = await createRes.json();
    const itemId = createData.item.id;
    expect(itemId).toBeDefined();
    expect(createData.item.client_name).toBe('Integration Test Client');
    expect(createData.item.status).toBe('TO_DO');

    // 2. Fetch item by ID
    const getReq = createMockRequest(`http://localhost:3000/api/items/${itemId}`);
    const getRes = await GetById(getReq, {
      params: Promise.resolve({ id: itemId }),
    });
    expect(getRes.status).toBe(200);

    const getData = await getRes.json();
    expect(getData.item.id).toBe(itemId);
    expect(getData.item.client_name).toBe('Integration Test Client');

    // 3. Update item
    const updateReq = createMockRequest(
      `http://localhost:3000/api/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          client_name: 'Updated Client Name',
          status: 'EDITING',
        }),
      }
    );

    const updateRes = await PATCH(updateReq, {
      params: Promise.resolve({ id: itemId }),
    });
    expect(updateRes.status).toBe(200);

    const updateData = await updateRes.json();
    expect(updateData.item.client_name).toBe('Updated Client Name');
    expect(updateData.item.status).toBe('EDITING');

    // 4. Verify update in list
    const listReq = createMockRequest('http://localhost:3000/api/items');
    const listRes = await GET(listReq);
    expect(listRes.status).toBe(200);

    const listData = await listRes.json();
    const updatedItem = listData.items.find(
      (item: { id: string }) => item.id === itemId
    );
    expect(updatedItem).toBeDefined();
    expect(updatedItem.client_name).toBe('Updated Client Name');

    // 5. Delete item
    const deleteReq = createMockRequest(
      `http://localhost:3000/api/items/${itemId}`
    );
    const deleteRes = await DELETE(deleteReq, {
      params: Promise.resolve({ id: itemId }),
    });
    expect(deleteRes.status).toBe(200);

    // 6. Verify item is gone
    const getAfterDeleteReq = createMockRequest(
      `http://localhost:3000/api/items/${itemId}`
    );
    const getAfterDeleteRes = await GetById(getAfterDeleteReq, {
      params: Promise.resolve({ id: itemId }),
    });
    expect(getAfterDeleteRes.status).toBe(404);

    vi.restoreAllMocks();
  });

  test('RLS prevents cross-user data access', async () => {
    // User 1 creates an item
    const session1 = mockSession(user1.userId, user1.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session1);

    const createReq = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'User1 Private Item',
        shoot_date: '2025-10-25',
      }),
    });

    const createRes = await POST(createReq);
    const { item: user1Item } = await createRes.json();

    // User 2 tries to access User 1's item
    const session2 = mockSession(user2.userId, user2.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session2);

    // Try GET by ID - should return 404 (RLS blocks it)
    const getReq = createMockRequest(
      `http://localhost:3000/api/items/${user1Item.id}`
    );
    const getRes = await GetById(getReq, {
      params: Promise.resolve({ id: user1Item.id }),
    });
    expect(getRes.status).toBe(404);

    // Try UPDATE - should return 404 (RLS blocks it)
    const updateReq = createMockRequest(
      `http://localhost:3000/api/items/${user1Item.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ client_name: 'Hacked!' }),
      }
    );
    const updateRes = await PATCH(updateReq, {
      params: Promise.resolve({ id: user1Item.id }),
    });
    expect(updateRes.status).toBe(404);

    // Try DELETE - should return 404 (RLS blocks it)
    const deleteReq = createMockRequest(
      `http://localhost:3000/api/items/${user1Item.id}`
    );
    const deleteRes = await DELETE(deleteReq, {
      params: Promise.resolve({ id: user1Item.id }),
    });
    expect(deleteRes.status).toBe(404);

    // Verify User 1's item still exists and wasn't modified
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session1);
    const verifyReq = createMockRequest(
      `http://localhost:3000/api/items/${user1Item.id}`
    );
    const verifyRes = await GetById(verifyReq, {
      params: Promise.resolve({ id: user1Item.id }),
    });
    expect(verifyRes.status).toBe(200);

    const verifyData = await verifyRes.json();
    expect(verifyData.item.client_name).toBe('User1 Private Item'); // Not "Hacked!"

    vi.restoreAllMocks();
  });

  test('Validation errors return 400', async () => {
    const session = mockSession(user1.userId, user1.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // Test 1: Empty client_name
    const req1 = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: '',
        shoot_date: '2025-10-25',
      }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    // Test 2: Invalid date format
    const req2 = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'Test Client',
        shoot_date: 'not-a-date',
      }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);

    // Test 3: Invalid status in PATCH
    const req3 = createMockRequest('http://localhost:3000/api/items/fake-id', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'INVALID_STATUS',
      }),
    });
    const res3 = await PATCH(req3, {
      params: Promise.resolve({ id: 'fake-id' }),
    });
    expect(res3.status).toBe(400);

    vi.restoreAllMocks();
  });

  test('Unauthorized requests return 401', async () => {
    // Mock no session
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(null);

    // Test GET /api/items
    const req1 = createMockRequest('http://localhost:3000/api/items');
    const res1 = await GET(req1);
    expect(res1.status).toBe(401);

    // Test POST /api/items
    const req2 = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'Test',
        shoot_date: '2025-10-25',
      }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(401);

    // Test GET /api/items/[id]
    const req3 = createMockRequest('http://localhost:3000/api/items/fake-id');
    const res3 = await GetById(req3, {
      params: Promise.resolve({ id: 'fake-id' }),
    });
    expect(res3.status).toBe(401);

    // Test PATCH /api/items/[id]
    const req4 = createMockRequest('http://localhost:3000/api/items/fake-id', {
      method: 'PATCH',
      body: JSON.stringify({ client_name: 'Test' }),
    });
    const res4 = await PATCH(req4, {
      params: Promise.resolve({ id: 'fake-id' }),
    });
    expect(res4.status).toBe(401);

    // Test DELETE /api/items/[id]
    const req5 = createMockRequest('http://localhost:3000/api/items/fake-id');
    const res5 = await DELETE(req5, {
      params: Promise.resolve({ id: 'fake-id' }),
    });
    expect(res5.status).toBe(401);

    vi.restoreAllMocks();
  });

  test('Filtering and sorting work correctly', async () => {
    const session = mockSession(user1.userId, user1.email);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // Create items with different statuses and dates
    await POST(
      createMockRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify({
          client_name: 'Client A',
          shoot_date: '2025-10-20',
        }),
      })
    );

    await POST(
      createMockRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify({
          client_name: 'Client B',
          shoot_date: '2025-10-25',
        }),
      })
    );

    const createRes3 = await POST(
      createMockRequest('http://localhost:3000/api/items', {
        method: 'POST',
        body: JSON.stringify({
          client_name: 'Client C',
          shoot_date: '2025-10-30',
        }),
      })
    );

    // Update one to EDITING status
    const { item: item3 } = await createRes3.json();
    await PATCH(
      createMockRequest(`http://localhost:3000/api/items/${item3.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'EDITING' }),
      }),
      { params: Promise.resolve({ id: item3.id }) }
    );

    // Test 1: Filter by status TO_DO
    const req1 = createMockRequest(
      'http://localhost:3000/api/items?status=TO_DO'
    );
    const res1 = await GET(req1);
    const data1 = await res1.json();
    expect(
      data1.items.every((item: { status: string }) => item.status === 'TO_DO')
    ).toBe(true);

    // Test 2: Filter by status EDITING
    const req2 = createMockRequest(
      'http://localhost:3000/api/items?status=EDITING'
    );
    const res2 = await GET(req2);
    const data2 = await res2.json();
    expect(
      data2.items.every(
        (item: { status: string }) => item.status === 'EDITING'
      )
    ).toBe(true);
    expect(data2.items).toHaveLength(1);

    // Test 3: Sort by shoot_date ascending
    const req3 = createMockRequest(
      'http://localhost:3000/api/items?sort=shoot_date&order=asc'
    );
    const res3 = await GET(req3);
    const data3 = await res3.json();
    const dates = data3.items.map((item: { shoot_date: string }) => item.shoot_date);
    expect(dates).toEqual([...dates].sort());

    // Test 4: Sort by shoot_date descending
    const req4 = createMockRequest(
      'http://localhost:3000/api/items?sort=shoot_date&order=desc'
    );
    const res4 = await GET(req4);
    const data4 = await res4.json();
    const datesDesc = data4.items.map((item: { shoot_date: string }) => item.shoot_date);
    expect(datesDesc).toEqual([...datesDesc].sort().reverse());

    vi.restoreAllMocks();
  });
});
