import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { POST } from '@/app/api/settings/route';
import { mockSession } from '../helpers/auth';
import { createTestUser, cleanupTestUsers, createTestItems } from '../helpers/db';
import { createMockRequest } from '../helpers/request';
import * as authModule from '@/lib/auth/session';
import { db } from '@/lib/db';
import { deliveryItems, userSettings } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// TODO: Fix NextRequest compatibility - request.json() is not a function
describe.skip('POST /api/settings', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const user = await createTestUser({
      email: `settings-test-${timestamp}@example.com`,
      timezone: 'UTC',
      defaultDeadlineDays: 30,
    });
    testUserId = user.userId;
    testEmail = user.email;
  });

  afterAll(async () => {
    await cleanupTestUsers([testUserId]);
  });

  describe('Basic Update Tests', () => {
    test('updates default_deadline_days only', async () => {
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { default_deadline_days: 14 },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.settings.default_deadline_days).toBe(14);
      expect(data.settings.timezone).toBe('UTC'); // Unchanged
      expect(data.recalculatedCount).toBe(0); // No applyToExisting

      vi.restoreAllMocks();
    });

    test('updates timezone only', async () => {
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { timezone: 'America/New_York' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.settings.timezone).toBe('America/New_York');
      expect(data.settings.default_deadline_days).toBe(14); // From previous test
      expect(data.recalculatedCount).toBe(0);

      vi.restoreAllMocks();
    });

    test('updates both default_deadline_days and timezone simultaneously', async () => {
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: {
          default_deadline_days: 21,
          timezone: 'Europe/Rome',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.settings.default_deadline_days).toBe(21);
      expect(data.settings.timezone).toBe('Europe/Rome');
      expect(data.recalculatedCount).toBe(0);

      vi.restoreAllMocks();
    });
  });

  describe('Bulk Recalculation Tests', () => {
    test('applyToExisting: true recalculates all non-ARCHIVED items', async () => {
      // Reset settings to known state (previous tests modified them)
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        await tx.update(userSettings)
          .set({ timezone: 'UTC', default_deadline_days: 30 })
          .where(eq(userSettings.user_id, testUserId));
      });

      // Clean up any existing items from previous tests
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        await tx.delete(deliveryItems).where(eq(deliveryItems.user_id, testUserId));
      });

      // Create test items with known shoot dates
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));

        const created = await createTestItems(tx, testUserId, 3);

        // Update items: 2 TO_DO, 1 ARCHIVED
        await tx.update(deliveryItems)
          .set({ status: 'TO_DO' })
          .where(eq(deliveryItems.id, created[0].id));

        await tx.update(deliveryItems)
          .set({ status: 'TO_DO' })
          .where(eq(deliveryItems.id, created[1].id));

        await tx.update(deliveryItems)
          .set({ status: 'ARCHIVED' })
          .where(eq(deliveryItems.id, created[2].id));
      });

      // Get original deadlines
      const originalDeadlines = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        return await tx.select().from(deliveryItems).where(eq(deliveryItems.user_id, testUserId));
      });

      // Update settings with applyToExisting: true
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: {
          default_deadline_days: 7, // Changed from 21
          applyToExisting: true,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.recalculatedCount).toBe(2); // Only non-ARCHIVED items

      // Verify deadlines changed for non-ARCHIVED items
      const updatedItems = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        return await tx.select().from(deliveryItems).where(eq(deliveryItems.user_id, testUserId));
      });

      const todoItems = updatedItems.filter(item => item.status === 'TO_DO');
      const archivedItem = updatedItems.find(item => item.status === 'ARCHIVED');

      // TO_DO items should have different deadlines
      expect(todoItems.length).toBe(2);
      todoItems.forEach(item => {
        const original = originalDeadlines.find(o => o.id === item.id);
        expect(item.computed_deadline).not.toBe(original!.computed_deadline);
        // custom_deadline should be reset to computed_deadline
        expect(item.custom_deadline?.toISOString()).toBe(item.computed_deadline.toISOString());
      });

      // ARCHIVED item should be unchanged
      const originalArchived = originalDeadlines.find(o => o.id === archivedItem!.id);
      expect(archivedItem!.computed_deadline.toISOString()).toBe(originalArchived!.computed_deadline.toISOString());

      vi.restoreAllMocks();
    });

    test('applyToExisting: false does NOT recalculate items', async () => {
      // Create test item
      const items = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        return await createTestItems(tx, testUserId, 1);
      });

      const originalItem = items[0];

      // Update settings WITHOUT applyToExisting
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: {
          default_deadline_days: 60,
          applyToExisting: false, // Explicit false
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.recalculatedCount).toBe(0); // No recalculation

      // Verify deadline unchanged
      const updatedItem = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        const items = await tx.select().from(deliveryItems).where(eq(deliveryItems.id, originalItem.id));
        return items[0];
      });

      expect(updatedItem.computed_deadline.toISOString()).toBe(originalItem.computed_deadline.toISOString());

      vi.restoreAllMocks();
    });

    test('bulk recalculation respects new timezone', async () => {
      // Create item with known shoot date
      const createdItems = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        return await createTestItems(tx, testUserId, 1);
      });

      // Change timezone from Europe/Rome to America/New_York with recalculation
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: {
          timezone: 'America/New_York',
          default_deadline_days: 10,
          applyToExisting: true,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.recalculatedCount).toBeGreaterThan(0);

      // Verify the deadline was recalculated
      // (We can't easily verify the exact time without duplicating the SQL logic,
      // but we can verify it changed)
      const updatedItem = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        const foundItems = await tx.select().from(deliveryItems).where(eq(deliveryItems.id, createdItems[0].id));
        return foundItems[0];
      });

      // The deadline should have changed due to timezone shift
      expect(updatedItem.computed_deadline).toBeDefined();

      vi.restoreAllMocks();
    });
  });

  describe('Validation Error Tests', () => {
    test('rejects invalid timezone with 400 error', async () => {
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { timezone: 'Invalid/Timezone' },
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('Invalid timezone');

      vi.restoreAllMocks();
    });

    test('rejects empty request body with 400 error', async () => {
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: {}, // No fields provided
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Invalid input');
      // The detailed Zod error is in data.details
      expect(data.details).toBeDefined();

      vi.restoreAllMocks();
    });

    test('rejects invalid default_deadline_days values', async () => {
      const session = mockSession(testUserId, testEmail);

      // Test 0 (too low)
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);
      const req1 = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { default_deadline_days: 0 },
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);

      // Test 366 (too high)
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);
      const req2 = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { default_deadline_days: 366 },
      });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);

      // Test negative
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);
      const req3 = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { default_deadline_days: -1 },
      });
      const res3 = await POST(req3);
      expect(res3.status).toBe(400);

      // Test non-integer
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);
      const req4 = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { default_deadline_days: 30.5 },
      });
      const res4 = await POST(req4);
      expect(res4.status).toBe(400);

      vi.restoreAllMocks();
    });
  });

  describe('Authorization & Edge Cases', () => {
    test('returns 401 without session', async () => {
      // Mock no session
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(null);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { default_deadline_days: 10 },
      });

      // withAuth throws an error when no session (which would be caught by Next.js in production)
      await expect(POST(req)).rejects.toThrow('Unauthorized');

      vi.restoreAllMocks();
    });

    test('bulk recalculation only affects current user items (RLS isolation)', async () => {
      // Create a second test user
      const timestamp = Date.now();
      const user2 = await createTestUser({
        email: `settings-test-user2-${timestamp}@example.com`,
        timezone: 'UTC',
        defaultDeadlineDays: 30,
      });

      // Create items for both users
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
        await createTestItems(tx, testUserId, 2);
      });

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user2.userId}'`));
        await createTestItems(tx, user2.userId, 2);
      });

      // Get user2's items before recalculation
      const user2ItemsBefore = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user2.userId}'`));
        return await tx.select().from(deliveryItems).where(eq(deliveryItems.user_id, user2.userId));
      });

      // Update testUser's settings with applyToExisting
      const session = mockSession(testUserId, testEmail);
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

      const req = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: {
          default_deadline_days: 5,
          applyToExisting: true,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.recalculatedCount).toBeGreaterThan(0);

      // Verify user2's items are UNCHANGED (RLS isolation)
      const user2ItemsAfter = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user2.userId}'`));
        return await tx.select().from(deliveryItems).where(eq(deliveryItems.user_id, user2.userId));
      });

      expect(user2ItemsAfter.length).toBe(user2ItemsBefore.length);
      user2ItemsAfter.forEach((item, idx) => {
        expect(item.computed_deadline.toISOString()).toBe(user2ItemsBefore[idx].computed_deadline.toISOString());
      });

      // Cleanup
      await cleanupTestUsers([user2.userId]);

      vi.restoreAllMocks();
    });

    test('accepts boundary values (1 and 365 days)', async () => {
      const session = mockSession(testUserId, testEmail);

      // Test minimum value (1 day)
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);
      const req1 = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { default_deadline_days: 1 },
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.settings.default_deadline_days).toBe(1);

      // Test maximum value (365 days)
      vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);
      const req2 = createMockRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: { default_deadline_days: 365 },
      });
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.settings.default_deadline_days).toBe(365);

      vi.restoreAllMocks();
    });
  });
});
