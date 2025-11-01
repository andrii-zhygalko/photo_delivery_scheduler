import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestUser, cleanupTestUsers } from '../helpers/db';
import { mockSession } from '../helpers/auth';
import * as authModule from '@/lib/auth/session';
import { POST } from '@/app/api/items/route';
import { createMockRequest } from '../helpers/request';

// TODO: Fix NextRequest compatibility - request.json() is not a function
describe.skip('POST /api/items', () => {
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

  test('Creates item with all required fields', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'John Smith',
        shoot_date: '2025-10-20',
        notes: 'Wedding shoot in Central Park',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.item.id).toBeDefined();
    expect(data.item.client_name).toBe('John Smith');
    expect(data.item.shoot_date).toBe('2025-10-20');
    expect(data.item.notes).toBe('Wedding shoot in Central Park');
    expect(data.item.status).toBe('TO_DO');
    expect(data.item.user_id).toBe(testUserId);
    expect(data.item.computed_deadline).toBeDefined();
    expect(data.item.custom_deadline).toBeDefined();

    vi.restoreAllMocks();
  });

  test('Creates item with minimal fields (notes optional)', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'Minimal Client',
        shoot_date: '2025-10-25',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.item.client_name).toBe('Minimal Client');
    expect(data.item.notes).toBeNull();

    vi.restoreAllMocks();
  });

  test('Returns 400 for empty client_name', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: '',
        shoot_date: '2025-10-20',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('Validation failed');

    vi.restoreAllMocks();
  });

  test('Returns 400 for invalid date format', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'Test Client',
        shoot_date: 'not-a-date',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);

    vi.restoreAllMocks();
  });

  test('Returns 400 for missing shoot_date', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const req = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'Test Client',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);

    vi.restoreAllMocks();
  });

  test('Returns 400 for notes exceeding max length', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    // Create a string longer than 1000 characters
    const longNotes = 'a'.repeat(1001);

    const req = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'Test Client',
        shoot_date: '2025-10-20',
        notes: longNotes,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);

    vi.restoreAllMocks();
  });

  test('Returns 401 when not authenticated', async () => {
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'Test',
        shoot_date: '2025-10-20',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Unauthorized');

    vi.restoreAllMocks();
  });

  test('Computed deadline is set correctly (shoot_date + 30 days)', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const shootDate = '2025-10-20';
    const req = createMockRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        client_name: 'Deadline Test',
        shoot_date: shootDate,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    const computed = new Date(data.item.computed_deadline);

    // Calculate expected deadline in UTC (shoot_date + 30 days at 23:59 UTC)
    // Database stores as UTC, so we must compare in UTC
    const shoot = new Date(shootDate + 'T00:00:00Z'); // Explicitly UTC
    const expected = new Date(shoot);
    expected.setUTCDate(expected.getUTCDate() + 30);
    expected.setUTCHours(23, 59, 0, 0);

    // Verify the calendar date is 30 days later using UTC methods
    expect(computed.getUTCFullYear()).toBe(expected.getUTCFullYear());
    expect(computed.getUTCMonth()).toBe(expected.getUTCMonth());
    expect(computed.getUTCDate()).toBe(expected.getUTCDate());

    // Verify time is set to 23:59:00 UTC
    expect(computed.getUTCHours()).toBe(23);
    expect(computed.getUTCMinutes()).toBe(59);
    expect(computed.getUTCSeconds()).toBe(0);

    vi.restoreAllMocks();
  });
});
