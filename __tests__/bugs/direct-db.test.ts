/**
 * Direct database test to verify trigger behavior
 * This bypasses all application code and tests the trigger directly
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { createTestUser, cleanupTestUsers } from '../helpers/db';

describe('Direct Database Trigger Test', () => {
  let testUserId: string;

  beforeAll(async () => {
    const { userId } = await createTestUser({
      email: `direct-db-${Date.now()}@test.com`,
      timezone: 'Europe/Rome',
      defaultDeadlineDays: 30,
    });
    testUserId = userId;
  });

  afterAll(async () => {
    await cleanupTestUsers([testUserId]);
  });

  test('trigger should preserve custom_deadline when provided', async () => {

    // Insert directly with SQL to bypass any application code
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));

      // Insert with explicit custom_deadline
      return await tx.execute<{
        id: string;
        shoot_date: string;
        computed_deadline: string;
        custom_deadline: string;
      }>(sql`
        INSERT INTO delivery_items (
          user_id,
          client_name,
          shoot_date,
          computed_deadline,
          custom_deadline
        ) VALUES (
          ${testUserId},
          'Direct DB Test',
          '2025-11-04'::date,
          NOW(),  -- Placeholder, trigger will set
          '2025-11-25 23:59:00+00'::timestamptz  -- Custom deadline
        )
        RETURNING id, shoot_date, computed_deadline, custom_deadline
      `);
    });

    const item = result.rows[0];
    console.log('Direct DB insert result:', {
      shoot_date: item.shoot_date,
      computed_deadline: item.computed_deadline,
      custom_deadline: item.custom_deadline,
    });

    const customDate = new Date(item.custom_deadline);
    const computedDate = new Date(item.computed_deadline);

    console.log('Parsed dates:', {
      custom: {
        month: customDate.getUTCMonth(),
        date: customDate.getUTCDate(),
        iso: customDate.toISOString(),
      },
      computed: {
        month: computedDate.getUTCMonth(),
        date: computedDate.getUTCDate(),
        iso: computedDate.toISOString(),
      },
    });

    // Custom should be November 25
    expect(customDate.getUTCMonth()).toBe(10); // November (0-indexed)
    expect(customDate.getUTCDate()).toBe(25);

    // Computed should be December 4
    expect(computedDate.getUTCMonth()).toBe(11); // December
    expect(computedDate.getUTCDate()).toBe(4);

    // Cleanup
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      await tx.execute(sql`DELETE FROM delivery_items WHERE id = ${item.id}`);
    });
  });
});
