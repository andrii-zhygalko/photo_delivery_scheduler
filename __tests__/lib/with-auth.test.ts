import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { withAuth } from '@/lib/api/with-auth';
import { db } from '@/lib/db';
import { deliveryItems } from '@/lib/db/schema';
import {
  createTestUser,
  createTestItems,
  cleanupTestUsers,
} from '../helpers/db';
import { mockSession } from '../helpers/auth';
import * as authModule from '@/lib/auth/session';
import { sql } from 'drizzle-orm';

describe('withAuth Helper', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    const user = await createTestUser();
    testUserId = user.userId;
    testEmail = user.email;

    // Create some test items (use sql.raw for SET commands)
    await db.transaction(async tx => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      await createTestItems(tx, testUserId, 3);
    });
  });

  afterAll(async () => {
    await cleanupTestUsers([testUserId]);
  });

  test('withAuth throws error when no session', async () => {
    // Mock getServerSession to return null
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(null);

    // Should throw "Unauthorized"
    await expect(
      withAuth(async () => {
        return [];
      })
    ).rejects.toThrow('Unauthorized');

    vi.restoreAllMocks();
  });

  test('withAuth sets app.user_id GUC correctly', async () => {
    // Mock session
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const result = await withAuth(async (callbackSession, tx) => {
      // Query current_setting to verify GUC was set
      const gucResult = await tx.execute<{ user_id: string }>(sql`
        SELECT current_setting('app.user_id', true) as user_id
      `);

      return gucResult.rows[0].user_id;
    });

    expect(result).toBe(testUserId);

    vi.restoreAllMocks();
  });

  test('withAuth provides session to callback', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const result = await withAuth(async callbackSession => {
      return callbackSession.user.id;
    });

    expect(result).toBe(testUserId);

    vi.restoreAllMocks();
  });

  test('withAuth allows RLS-filtered queries', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const items = await withAuth(async (callbackSession, tx) => {
      return tx.select().from(deliveryItems);
    });

    // Should return only this user's items
    expect(items).toHaveLength(3);
    expect(items.every(item => item.user_id === testUserId)).toBe(true);

    vi.restoreAllMocks();
  });

  test('withAuth transaction rolls back on error', async () => {
    const session = mockSession(testUserId, testEmail);
    vi.spyOn(authModule, 'getServerSession').mockResolvedValue(session);

    const itemsBefore = await db.transaction(async tx => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return tx.select().from(deliveryItems);
    });

    const initialCount = itemsBefore.length;

    // Attempt operation that throws error
    try {
      await withAuth(async (callbackSession, tx) => {
        // Insert item
        await tx.insert(deliveryItems).values({
          user_id: testUserId,
          client_name: 'Rollback Test',
          shoot_date: '2025-10-20',
          computed_deadline: new Date('2025-11-19T22:59:00.000Z'),
          status: 'TO_DO',
        });

        // Throw error (should trigger rollback)
        throw new Error('Test error');
      });
    } catch (error) {
      console.error(error);
    }

    // Verify item was NOT inserted (transaction rolled back)
    const itemsAfter = await db.transaction(async tx => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return tx.select().from(deliveryItems);
    });

    expect(itemsAfter).toHaveLength(initialCount);

    vi.restoreAllMocks();
  });
});
