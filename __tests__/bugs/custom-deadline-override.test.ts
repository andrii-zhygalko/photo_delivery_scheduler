/**
 * Test to reproduce custom deadline bug
 * Issue: Custom deadline is overwritten by trigger on INSERT
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { deliveryItems } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { createTestUser, cleanupTestUsers } from '../helpers/db';

describe('Custom Deadline Override Bug', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user with settings
    const { userId } = await createTestUser({
      email: `custom-deadline-${Date.now()}@test.com`,
      name: 'Custom Deadline Test User',
      timezone: 'Europe/Rome',
      defaultDeadlineDays: 30,
    });

    testUserId = userId;
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestUsers([testUserId]);
  });

  test('custom deadline should NOT be overwritten by trigger on INSERT', async () => {
    // Scenario: User creates shoot on Nov 4, 2025 with custom deadline Nov 25, 2025
    // Expected computed: Dec 4, 2025 (Nov 4 + 30 days)
    // Expected custom: Nov 25, 2025 (user's choice)

    const shootDate = '2025-11-04';
    const customDeadlineDate = new Date('2025-11-25T23:59:00Z'); // User wants Nov 25

    const [item] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));

      return await tx
        .insert(deliveryItems)
        .values({
          user_id: testUserId,
          client_name: 'Test Client - Custom Deadline',
          shoot_date: shootDate,
          computed_deadline: new Date(), // Placeholder - trigger will set
          custom_deadline: customDeadlineDate,
        })
        .returning();
    });

    console.log('Created item:', {
      shoot_date: item.shoot_date,
      computed_deadline: item.computed_deadline,
      custom_deadline: item.custom_deadline,
    });

    // Check computed deadline (should be Dec 4, 2025 at 23:59 Europe/Rome)
    const computedDate = new Date(item.computed_deadline);
    expect(computedDate.getUTCMonth()).toBe(11); // December (0-indexed)
    expect(computedDate.getUTCDate()).toBe(4);

    // Check custom deadline (should be Nov 25, 2025)
    expect(item.custom_deadline).not.toBeNull();
    const customDate = new Date(item.custom_deadline!);
    expect(customDate.getUTCMonth()).toBe(10); // November (0-indexed)
    expect(customDate.getUTCDate()).toBe(25);

    // Verify they're NOT equal (bug would make them equal)
    expect(item.custom_deadline!.getTime()).not.toBe(item.computed_deadline.getTime());

    // Custom should be earlier (for lightning bolt)
    expect(item.custom_deadline!.getTime()).toBeLessThan(item.computed_deadline.getTime());
  });

  test('lightning bolt should appear when custom < computed', async () => {
    // This tests the DeadlineBadge logic
    const shootDate = '2025-11-04';
    const customDeadlineDate = new Date('2025-11-25T23:59:00Z');

    const [item] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));

      return await tx
        .insert(deliveryItems)
        .values({
          user_id: testUserId,
          client_name: 'Test Client - Lightning Bolt',
          shoot_date: shootDate,
          computed_deadline: new Date(),
          custom_deadline: customDeadlineDate,
        })
        .returning();
    });

    // Simulate DeadlineBadge comparison logic
    const customDeadline = item.custom_deadline;
    const computedDeadline = item.computed_deadline;

    const isCustomEarlier =
      customDeadline &&
      (customDeadline instanceof Date
        ? customDeadline
        : new Date(customDeadline)
      ).getTime() <
        (computedDeadline instanceof Date
          ? computedDeadline
          : new Date(computedDeadline)
        ).getTime();

    console.log('Lightning bolt check:', {
      customDeadline: customDeadline,
      computedDeadline: computedDeadline,
      isCustomEarlier,
    });

    expect(isCustomEarlier).toBe(true); // Should show lightning bolt
  });

  test('custom deadline should reset when shoot_date changes', async () => {
    // Create item with custom deadline
    const [item] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));

      return await tx
        .insert(deliveryItems)
        .values({
          user_id: testUserId,
          client_name: 'Test Client - Date Change',
          shoot_date: '2025-11-04',
          computed_deadline: new Date(),
          custom_deadline: new Date('2025-11-25T23:59:00Z'),
        })
        .returning();
    });

    expect(item.custom_deadline).not.toBeNull();
    const originalCustom = item.custom_deadline!.getTime();

    // Update shoot_date
    const [updated] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));

      return await tx
        .update(deliveryItems)
        .set({ shoot_date: '2025-11-10' })
        .where(eq(deliveryItems.id, item.id))
        .returning();
    });

    expect(updated.custom_deadline).not.toBeNull();

    console.log('After shoot_date change:', {
      old_shoot_date: item.shoot_date,
      new_shoot_date: updated.shoot_date,
      old_custom_deadline: item.custom_deadline,
      new_custom_deadline: updated.custom_deadline,
      custom_equals_computed: updated.custom_deadline!.getTime() === updated.computed_deadline.getTime(),
    });

    // Custom deadline should now equal computed (reset behavior)
    expect(updated.custom_deadline!.getTime()).toBe(updated.computed_deadline.getTime());
    expect(updated.custom_deadline!.getTime()).not.toBe(originalCustom);
  });
});
