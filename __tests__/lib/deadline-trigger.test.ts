/**
 * Tests for the database trigger that computes deadlines
 * Phase 3: Deadline Logic & Database Triggers
 */

import { describe, test, expect, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { deliveryItems, userSettings } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { createTestUser, cleanupTestUsers } from '../helpers/db';

describe('Deadline Trigger', () => {
  const testUserIds: string[] = [];

  afterAll(async () => {
    await cleanupTestUsers(testUserIds);
  });

  test('trigger computes deadline on INSERT', async () => {
    const { userId } = await createTestUser({
      email: `trigger-insert-${Date.now()}@test.com`,
      timezone: 'America/New_York',
      defaultDeadlineDays: 7,
    });
    testUserIds.push(userId);

    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      // Insert item with shoot_date, let trigger compute deadline
      const [item] = await tx
        .insert(deliveryItems)
        .values({
          user_id: userId,
          client_name: 'Test Client',
          shoot_date: '2025-03-15', // Not DST boundary
          // computed_deadline will be set by trigger
          computed_deadline: new Date(), // Placeholder, will be overwritten
        })
        .returning();

      // Verify computed_deadline was set by trigger
      expect(item.computed_deadline).toBeTruthy();

      // Verify it's approximately 7 days after shoot_date at 23:59
      // shoot_date = 2025-03-15 EST → deadline = 2025-03-22 23:59 EDT (DST starts Mar 9)
      const expectedDeadline = new Date('2025-03-22T23:59:00-04:00');

      const actualDeadline = new Date(item.computed_deadline!);

      // Allow 1 minute tolerance for computation
      const timeDiff = Math.abs(
        actualDeadline.getTime() - expectedDeadline.getTime()
      );
      expect(timeDiff).toBeLessThan(60 * 1000);

      // Verify custom_deadline was initialized to computed_deadline
      expect(item.custom_deadline).toBeTruthy();
      expect(item.custom_deadline!.getTime()).toBe(
        item.computed_deadline!.getTime()
      );
    });
  });

  test('trigger uses user timezone (not hardcoded)', async () => {
    const { userId } = await createTestUser({
      email: `trigger-timezone-${Date.now()}@test.com`,
      timezone: 'Asia/Tokyo', // UTC+9, no DST
      defaultDeadlineDays: 10,
    });
    testUserIds.push(userId);

    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      const [item] = await tx
        .insert(deliveryItems)
        .values({
          user_id: userId,
          client_name: 'Tokyo Client',
          shoot_date: '2025-04-01',
          computed_deadline: new Date(), // Placeholder
        })
        .returning();

      // Expected: 2025-04-11 23:59 JST = 2025-04-11 14:59 UTC
      const expectedUTC = new Date('2025-04-11T14:59:00Z');
      const actualDeadline = new Date(item.computed_deadline!);

      const timeDiff = Math.abs(
        actualDeadline.getTime() - expectedUTC.getTime()
      );
      expect(timeDiff).toBeLessThan(60 * 1000);
    });
  });

  test('trigger resets custom_deadline when shoot_date changes', async () => {
    const { userId } = await createTestUser({
      email: `trigger-reset-${Date.now()}@test.com`,
      timezone: 'Europe/Rome',
      defaultDeadlineDays: 14,
    });
    testUserIds.push(userId);

    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      // Create item
      const [item] = await tx
        .insert(deliveryItems)
        .values({
          user_id: userId,
          client_name: 'Rome Client',
          shoot_date: '2025-05-01',
          computed_deadline: new Date(), // Placeholder
        })
        .returning();

      const originalComputedDeadline = item.computed_deadline!;

      // Verify custom_deadline is initially same as computed_deadline
      expect(item.custom_deadline!.getTime()).toBe(
        originalComputedDeadline.getTime()
      );

      // Manually set a custom deadline (earlier than computed)
      const customDeadline = new Date(originalComputedDeadline);
      customDeadline.setDate(customDeadline.getDate() - 3);

      await tx
        .update(deliveryItems)
        .set({ custom_deadline: customDeadline })
        .where(eq(deliveryItems.id, item.id));

      // Now update shoot_date - trigger should reset custom_deadline
      const [updatedItem] = await tx
        .update(deliveryItems)
        .set({ shoot_date: '2025-05-10' }) // Changed shoot_date
        .where(eq(deliveryItems.id, item.id))
        .returning();

      // Verify computed_deadline was recalculated
      expect(updatedItem.computed_deadline!.getTime()).not.toBe(
        originalComputedDeadline.getTime()
      );

      // Verify custom_deadline was reset to NEW computed_deadline
      expect(updatedItem.custom_deadline!.getTime()).toBe(
        updatedItem.computed_deadline!.getTime()
      );
    });
  });

  test('trigger does NOT reset custom_deadline when other fields change', async () => {
    const { userId } = await createTestUser({
      email: `trigger-no-reset-${Date.now()}@test.com`,
      timezone: 'America/Los_Angeles',
      defaultDeadlineDays: 21,
    });
    testUserIds.push(userId);

    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      // Create item
      const [item] = await tx
        .insert(deliveryItems)
        .values({
          user_id: userId,
          client_name: 'LA Client',
          shoot_date: '2025-06-01',
          computed_deadline: new Date(), // Placeholder
        })
        .returning();

      // Manually set a custom deadline (earlier than computed)
      const customDeadline = new Date(item.computed_deadline!);
      customDeadline.setDate(customDeadline.getDate() - 5);

      await tx
        .update(deliveryItems)
        .set({ custom_deadline: customDeadline })
        .where(eq(deliveryItems.id, item.id));

      // Update OTHER fields (not shoot_date)
      const [updatedItem] = await tx
        .update(deliveryItems)
        .set({
          client_name: 'LA Client Updated',
          notes: 'New notes',
          status: 'EDITING',
        })
        .where(eq(deliveryItems.id, item.id))
        .returning();

      // Verify custom_deadline was NOT reset (still custom)
      expect(updatedItem.custom_deadline!.getTime()).toBe(
        customDeadline.getTime()
      );
      expect(updatedItem.custom_deadline!.getTime()).not.toBe(
        updatedItem.computed_deadline!.getTime()
      );
    });
  });

  test('trigger respects user default_deadline_days setting', async () => {
    const { userId } = await createTestUser({
      email: `trigger-days-${Date.now()}@test.com`,
      timezone: 'UTC',
      defaultDeadlineDays: 45, // Custom value
    });
    testUserIds.push(userId);

    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      const [item] = await tx
        .insert(deliveryItems)
        .values({
          user_id: userId,
          client_name: 'UTC Client',
          shoot_date: '2025-01-01',
          computed_deadline: new Date(), // Placeholder
        })
        .returning();

      // Expected: 2025-01-01 + 45 days = 2025-02-15 at 23:59 UTC
      const expectedDeadline = new Date('2025-02-15T23:59:00Z');
      const actualDeadline = new Date(item.computed_deadline!);

      const timeDiff = Math.abs(
        actualDeadline.getTime() - expectedDeadline.getTime()
      );
      expect(timeDiff).toBeLessThan(60 * 1000);
    });
  });

  test.skip('trigger handles NULL timezone (falls back to UTC)', async () => {
    const { userId } = await createTestUser({
      email: `trigger-null-tz-${Date.now()}@test.com`,
      timezone: 'America/New_York',
      defaultDeadlineDays: 7,
    });
    testUserIds.push(userId);

    // Manually set timezone to NULL (edge case) - must use GUC for RLS
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));
      await tx
        .update(userSettings)
        .set({ timezone: null as unknown as string }) // Force NULL
        .where(eq(userSettings.user_id, userId));
    });

    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      const [item] = await tx
        .insert(deliveryItems)
        .values({
          user_id: userId,
          client_name: 'Null TZ Client',
          shoot_date: '2025-07-01',
          computed_deadline: new Date(), // Placeholder
        })
        .returning();

      // Should fall back to UTC: 2025-07-08 23:59 UTC
      const expectedDeadline = new Date('2025-07-08T23:59:00Z');
      const actualDeadline = new Date(item.computed_deadline!);

      const timeDiff = Math.abs(
        actualDeadline.getTime() - expectedDeadline.getTime()
      );
      expect(timeDiff).toBeLessThan(60 * 1000);
    });
  });
});
