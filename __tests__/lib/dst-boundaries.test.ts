/**
 * DST Boundary Tests for Deadline Computation
 * Phase 3.1: Testing & Verification
 *
 * Verifies that deadlines are always computed as 23:59 local time,
 * even when crossing DST transitions (spring forward / fall back).
 *
 * Common DST Bug: If timezone math is wrong, deadlines might be 22:59 or 00:59
 * instead of 23:59 due to the 1-hour shift.
 */

import { describe, test, expect, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { deliveryItems } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { createTestUser, cleanupTestUsers } from '../helpers/db';

describe('DST Boundary Tests', () => {
  const testUserIds: string[] = [];

  afterAll(async () => {
    await cleanupTestUsers(testUserIds);
  });

  describe('America/New_York (EDT/EST)', () => {
    test('spring forward (shoot before DST, deadline after DST)', async () => {
      const { userId } = await createTestUser({
        email: `dst-ny-spring-${Date.now()}@test.com`,
        timezone: 'America/New_York',
        defaultDeadlineDays: 10,
      });
      testUserIds.push(userId);

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

        // Shoot date: March 1, 2025 (before DST starts)
        // DST starts: March 9, 2025 at 2:00 AM → 3:00 AM (EDT begins, UTC-4)
        // Deadline: March 11, 2025 (after DST started)
        const [item] = await tx
          .insert(deliveryItems)
          .values({
            user_id: userId,
            client_name: 'NY Spring Forward Test',
            shoot_date: '2025-03-01',
            computed_deadline: new Date(), // Placeholder
          })
          .returning();

        // Expected: 2025-03-11 23:59 EDT (UTC-4)
        const expectedDeadline = new Date('2025-03-11T23:59:00-04:00');
        const actualDeadline = new Date(item.computed_deadline!);

        const timeDiff = Math.abs(
          actualDeadline.getTime() - expectedDeadline.getTime()
        );
        expect(timeDiff).toBeLessThan(60 * 1000); // Allow 1 minute tolerance

        // Verify it's exactly 23:59 in local time (not 22:59 or 00:59)
        const localTime = actualDeadline.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        expect(localTime).toBe('23:59');
      });
    });

    test('fall back (shoot before DST end, deadline after DST end)', async () => {
      const { userId } = await createTestUser({
        email: `dst-ny-fall-${Date.now()}@test.com`,
        timezone: 'America/New_York',
        defaultDeadlineDays: 10,
      });
      testUserIds.push(userId);

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

        // Shoot date: October 25, 2025 (before DST ends)
        // DST ends: November 2, 2025 at 2:00 AM → 1:00 AM (EST begins, UTC-5)
        // Deadline: November 4, 2025 (after DST ended)
        const [item] = await tx
          .insert(deliveryItems)
          .values({
            user_id: userId,
            client_name: 'NY Fall Back Test',
            shoot_date: '2025-10-25',
            computed_deadline: new Date(), // Placeholder
          })
          .returning();

        // Expected: 2025-11-04 23:59 EST (UTC-5)
        const expectedDeadline = new Date('2025-11-04T23:59:00-05:00');
        const actualDeadline = new Date(item.computed_deadline!);

        const timeDiff = Math.abs(
          actualDeadline.getTime() - expectedDeadline.getTime()
        );
        expect(timeDiff).toBeLessThan(60 * 1000);

        // Verify it's exactly 23:59 in local time
        const localTime = actualDeadline.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        expect(localTime).toBe('23:59');
      });
    });

    test('deadline falls exactly on spring forward date', async () => {
      const { userId } = await createTestUser({
        email: `dst-ny-on-spring-${Date.now()}@test.com`,
        timezone: 'America/New_York',
        defaultDeadlineDays: 8,
      });
      testUserIds.push(userId);

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

        // Shoot date: March 1, 2025
        // Deadline: March 9, 2025 (the exact day DST starts)
        const [item] = await tx
          .insert(deliveryItems)
          .values({
            user_id: userId,
            client_name: 'NY Deadline On DST Start',
            shoot_date: '2025-03-01',
            computed_deadline: new Date(),
          })
          .returning();

        // Expected: 2025-03-09 23:59 EDT (even though 2:00-3:00 AM doesn't exist that day)
        const expectedDeadline = new Date('2025-03-09T23:59:00-04:00');
        const actualDeadline = new Date(item.computed_deadline!);

        const timeDiff = Math.abs(
          actualDeadline.getTime() - expectedDeadline.getTime()
        );
        expect(timeDiff).toBeLessThan(60 * 1000);

        const localTime = actualDeadline.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        expect(localTime).toBe('23:59');
      });
    });
  });

  describe('Europe/Rome (CEST/CET)', () => {
    test('spring forward (shoot before DST, deadline after DST)', async () => {
      const { userId } = await createTestUser({
        email: `dst-rome-spring-${Date.now()}@test.com`,
        timezone: 'Europe/Rome',
        defaultDeadlineDays: 10,
      });
      testUserIds.push(userId);

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

        // Shoot date: March 20, 2025 (before DST)
        // DST starts: March 30, 2025 at 2:00 AM → 3:00 AM (CEST begins, UTC+2)
        // Deadline: March 30, 2025 (same day as DST start)
        const [item] = await tx
          .insert(deliveryItems)
          .values({
            user_id: userId,
            client_name: 'Rome Spring Forward Test',
            shoot_date: '2025-03-20',
            computed_deadline: new Date(),
          })
          .returning();

        // Expected: 2025-03-30 23:59 CEST (UTC+2)
        const expectedDeadline = new Date('2025-03-30T23:59:00+02:00');
        const actualDeadline = new Date(item.computed_deadline!);

        const timeDiff = Math.abs(
          actualDeadline.getTime() - expectedDeadline.getTime()
        );
        expect(timeDiff).toBeLessThan(60 * 1000);

        const localTime = actualDeadline.toLocaleString('en-US', {
          timeZone: 'Europe/Rome',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        expect(localTime).toBe('23:59');
      });
    });

    test('fall back (shoot before DST end, deadline after DST end)', async () => {
      const { userId } = await createTestUser({
        email: `dst-rome-fall-${Date.now()}@test.com`,
        timezone: 'Europe/Rome',
        defaultDeadlineDays: 10,
      });
      testUserIds.push(userId);

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

        // Shoot date: October 20, 2025 (before DST ends)
        // DST ends: October 26, 2025 at 3:00 AM → 2:00 AM (CET begins, UTC+1)
        // Deadline: October 30, 2025 (after DST ended)
        const [item] = await tx
          .insert(deliveryItems)
          .values({
            user_id: userId,
            client_name: 'Rome Fall Back Test',
            shoot_date: '2025-10-20',
            computed_deadline: new Date(),
          })
          .returning();

        // Expected: 2025-10-30 23:59 CET (UTC+1)
        const expectedDeadline = new Date('2025-10-30T23:59:00+01:00');
        const actualDeadline = new Date(item.computed_deadline!);

        const timeDiff = Math.abs(
          actualDeadline.getTime() - expectedDeadline.getTime()
        );
        expect(timeDiff).toBeLessThan(60 * 1000);

        const localTime = actualDeadline.toLocaleString('en-US', {
          timeZone: 'Europe/Rome',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        expect(localTime).toBe('23:59');
      });
    });
  });

  describe('Asia/Tokyo (JST - No DST)', () => {
    test('no DST transitions (control case)', async () => {
      const { userId } = await createTestUser({
        email: `dst-tokyo-nodst-${Date.now()}@test.com`,
        timezone: 'Asia/Tokyo',
        defaultDeadlineDays: 10,
      });
      testUserIds.push(userId);

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

        // Tokyo never observes DST, always UTC+9
        const [item] = await tx
          .insert(deliveryItems)
          .values({
            user_id: userId,
            client_name: 'Tokyo No DST Test',
            shoot_date: '2025-03-20',
            computed_deadline: new Date(),
          })
          .returning();

        // Expected: 2025-03-30 23:59 JST (UTC+9)
        const expectedDeadline = new Date('2025-03-30T23:59:00+09:00');
        const actualDeadline = new Date(item.computed_deadline!);

        const timeDiff = Math.abs(
          actualDeadline.getTime() - expectedDeadline.getTime()
        );
        expect(timeDiff).toBeLessThan(60 * 1000);

        const localTime = actualDeadline.toLocaleString('en-US', {
          timeZone: 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        expect(localTime).toBe('23:59');
      });
    });

    test('consistency across seasons (no DST variation)', async () => {
      const { userId } = await createTestUser({
        email: `dst-tokyo-seasons-${Date.now()}@test.com`,
        timezone: 'Asia/Tokyo',
        defaultDeadlineDays: 14,
      });
      testUserIds.push(userId);

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

        // Test winter and summer dates - both should be UTC+9
        const winterItem = await tx
          .insert(deliveryItems)
          .values({
            user_id: userId,
            client_name: 'Tokyo Winter',
            shoot_date: '2025-01-15', // Winter
            computed_deadline: new Date(),
          })
          .returning();

        const summerItem = await tx
          .insert(deliveryItems)
          .values({
            user_id: userId,
            client_name: 'Tokyo Summer',
            shoot_date: '2025-07-15', // Summer
            computed_deadline: new Date(),
          })
          .returning();

        // Both should be 23:59 JST regardless of season
        const winterLocal = new Date(winterItem[0].computed_deadline!).toLocaleString('en-US', {
          timeZone: 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        const summerLocal = new Date(summerItem[0].computed_deadline!).toLocaleString('en-US', {
          timeZone: 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        expect(winterLocal).toBe('23:59');
        expect(summerLocal).toBe('23:59');
      });
    });
  });
});
