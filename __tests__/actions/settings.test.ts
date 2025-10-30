/**
 * Tests for Server Actions (src/actions/settings.ts)
 * Tests settings updates with and without recalculation
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { sql, eq, ne, and } from 'drizzle-orm';
import { deliveryItems, userSettings } from '@/lib/db/schema';
import { createTestUser, cleanupTestUsers } from '../helpers/db';
import { updateSettingsAction } from '@/actions/settings';
import { createItemAction, archiveItemAction } from '@/actions/items';
import { computeDeadline } from '@/lib/date-utils';

// Mock next/cache revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock getServerSession
vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from '@/lib/auth/session';

describe('Server Actions - Settings', () => {
  let testUser1Id: string;
  let testUser2Id: string;

  beforeAll(async () => {
    // Create test users with default settings (30 days, UTC)
    const user1 = await createTestUser({
      email: `settings-user1-${Date.now()}@test.com`,
    });
    const user2 = await createTestUser({
      email: `settings-user2-${Date.now()}@test.com`,
    });
    testUser1Id = user1.userId;
    testUser2Id = user2.userId;
  });

  afterAll(async () => {
    await cleanupTestUsers([testUser1Id, testUser2Id]);
  });

  describe('updateSettingsAction - Basic Updates', () => {
    test('updates default_deadline_days only', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('default_deadline_days', '45');

      const result = await updateSettingsAction(formData);

      expect(result.success).toBe(true);

      // Verify settings updated
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, testUser1Id));
      });

      expect(queryResult.length).toBe(1);
      expect(queryResult[0].default_deadline_days).toBe(45);
    });

    test('updates timezone only', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('timezone', 'America/New_York');

      const result = await updateSettingsAction(formData);

      expect(result.success).toBe(true);

      // Verify timezone updated
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, testUser1Id));
      });

      expect(queryResult.length).toBe(1);
      expect(queryResult[0].timezone).toBe('America/New_York');
    });

    test('updates both fields simultaneously', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('default_deadline_days', '60');
      formData.append('timezone', 'Europe/Rome');

      const result = await updateSettingsAction(formData);

      expect(result.success).toBe(true);

      // Verify both fields updated
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, testUser1Id));
      });

      expect(queryResult.length).toBe(1);
      expect(queryResult[0].default_deadline_days).toBe(60);
      expect(queryResult[0].timezone).toBe('Europe/Rome');
    });

    test('returns error when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const formData = new FormData();
      formData.append('default_deadline_days', '45');

      const result = await updateSettingsAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('signed in');
      }
    });
  });

  describe('updateSettingsAction - Recalculation', () => {
    test('recalculates with new deadline days', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser2Id, email: 'test2@example.com', name: 'Test User 2' },
        expires: '2099-01-01',
      });

      // Create 3 test items
      const createFormData1 = new FormData();
      createFormData1.append('client_name', 'Recalc Test 1');
      createFormData1.append('shoot_date', '2025-11-01');
      await createItemAction(createFormData1);

      const createFormData2 = new FormData();
      createFormData2.append('client_name', 'Recalc Test 2');
      createFormData2.append('shoot_date', '2025-11-15');
      await createItemAction(createFormData2);

      const createFormData3 = new FormData();
      createFormData3.append('client_name', 'Recalc Test 3');
      createFormData3.append('shoot_date', '2025-12-01');
      await createItemAction(createFormData3);

      // Get items before recalculation
      const itemsBefore = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser2Id}'`));
        return tx
          .select()
          .from(deliveryItems)
          .where(eq(deliveryItems.user_id, testUser2Id));
      });

      expect(itemsBefore.length).toBe(3);

      // Change deadline days from 30 to 60 with recalculation
      const settingsFormData = new FormData();
      settingsFormData.append('default_deadline_days', '60');
      settingsFormData.append('applyToExisting', 'true');

      const result = await updateSettingsAction(settingsFormData);
      expect(result.success).toBe(true);

      // Verify all items recalculated
      const itemsAfter = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser2Id}'`));
        return tx
          .select()
          .from(deliveryItems)
          .where(eq(deliveryItems.user_id, testUser2Id));
      });

      expect(itemsAfter.length).toBe(3);

      // Verify each item has correct deadline (60 days instead of 30)
      for (const item of itemsAfter) {
        const expectedDeadline = computeDeadline(
          item.shoot_date,
          60,
          'UTC' // User2 is still UTC
        );
        expect(item.computed_deadline.toISOString()).toBe(expectedDeadline);
        // Custom deadline should be reset to computed deadline
        expect(item.custom_deadline).toBeTruthy();
        expect(item.custom_deadline!.toISOString()).toBe(expectedDeadline);
      }
    });

    test('recalculates with new timezone', async () => {
      // Reset user1 settings to known state
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        await tx
          .update(userSettings)
          .set({ default_deadline_days: 30, timezone: 'UTC' })
          .where(eq(userSettings.user_id, testUser1Id));
      });

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      // Create item with UTC timezone
      const createFormData = new FormData();
      createFormData.append('client_name', 'Timezone Recalc Test');
      createFormData.append('shoot_date', '2025-11-15');
      await createItemAction(createFormData);

      // Change timezone to Europe/Rome with recalculation
      const settingsFormData = new FormData();
      settingsFormData.append('timezone', 'Europe/Rome');
      settingsFormData.append('applyToExisting', 'true');

      const result = await updateSettingsAction(settingsFormData);
      expect(result.success).toBe(true);

      // Verify deadline adjusted to Europe/Rome time
      const items = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx
          .select()
          .from(deliveryItems)
          .where(eq(deliveryItems.user_id, testUser1Id));
      });

      expect(items.length).toBeGreaterThan(0);
      const item = items[items.length - 1]; // Get the last created item

      const expectedDeadline = computeDeadline(
        item.shoot_date,
        30,
        'Europe/Rome'
      );
      expect(item.computed_deadline.toISOString()).toBe(expectedDeadline);
    });

    test('recalculation skips archived items', async () => {
      // Reset user2 settings
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser2Id}'`));
        await tx
          .update(userSettings)
          .set({ default_deadline_days: 30, timezone: 'UTC' })
          .where(eq(userSettings.user_id, testUser2Id));

        // Delete previous test items for user2
        await tx
          .delete(deliveryItems)
          .where(eq(deliveryItems.user_id, testUser2Id));
      });

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser2Id, email: 'test2@example.com', name: 'Test User 2' },
        expires: '2099-01-01',
      });

      // Create items with different statuses
      const createFormData1 = new FormData();
      createFormData1.append('client_name', 'Active Item');
      createFormData1.append('shoot_date', '2025-11-01');
      await createItemAction(createFormData1);

      const createFormData2 = new FormData();
      createFormData2.append('client_name', 'Editing Item');
      createFormData2.append('shoot_date', '2025-11-15');
      await createItemAction(createFormData2);

      const createFormData3 = new FormData();
      createFormData3.append('client_name', 'Archived Item');
      createFormData3.append('shoot_date', '2025-10-01');
      const archivedItemResult = await createItemAction(createFormData3);

      // Archive the third item
      if (archivedItemResult.success) {
        await archiveItemAction(archivedItemResult.data.id);
      }

      // Get archived item's deadline before recalculation
      const archivedItemId =
        archivedItemResult.success ? archivedItemResult.data.id : '';
      const archivedItemBefore = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser2Id}'`));
        const result = await tx
          .select()
          .from(deliveryItems)
          .where(eq(deliveryItems.id, archivedItemId));
        return result[0];
      });

      // Change settings with recalculation
      const settingsFormData = new FormData();
      settingsFormData.append('default_deadline_days', '90');
      settingsFormData.append('applyToExisting', 'true');

      const result = await updateSettingsAction(settingsFormData);
      expect(result.success).toBe(true);

      // Verify archived item unchanged
      const archivedItemAfter = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser2Id}'`));
        const result = await tx
          .select()
          .from(deliveryItems)
          .where(eq(deliveryItems.id, archivedItemId));
        return result[0];
      });

      expect(archivedItemAfter.computed_deadline.toISOString()).toBe(
        archivedItemBefore.computed_deadline.toISOString()
      );

      // Verify non-archived items were updated
      const nonArchivedItems = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser2Id}'`));
        return tx
          .select()
          .from(deliveryItems)
          .where(
            and(
              eq(deliveryItems.user_id, testUser2Id),
              ne(deliveryItems.status, 'ARCHIVED')
            )
          );
      });

      expect(nonArchivedItems.length).toBe(2);
      for (const item of nonArchivedItems) {
        const expectedDeadline = computeDeadline(item.shoot_date, 90, 'UTC');
        expect(item.computed_deadline.toISOString()).toBe(expectedDeadline);
      }
    });

    test('no recalculation when applyToExisting is false', async () => {
      // Reset user1 and delete all items
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        await tx
          .update(userSettings)
          .set({ default_deadline_days: 30, timezone: 'UTC' })
          .where(eq(userSettings.user_id, testUser1Id));
        await tx
          .delete(deliveryItems)
          .where(eq(deliveryItems.user_id, testUser1Id));
      });

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      // Create test item
      const createFormData = new FormData();
      createFormData.append('client_name', 'No Recalc Test');
      createFormData.append('shoot_date', '2025-11-20');
      await createItemAction(createFormData);

      // Get item's deadline before settings change
      const itemsBefore = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx
          .select()
          .from(deliveryItems)
          .where(eq(deliveryItems.user_id, testUser1Id));
      });

      expect(itemsBefore.length).toBe(1);
      const deadlineBefore = itemsBefore[0].computed_deadline.toISOString();

      // Change settings WITHOUT applyToExisting
      const settingsFormData = new FormData();
      settingsFormData.append('default_deadline_days', '90');
      // applyToExisting defaults to false if not set

      const result = await updateSettingsAction(settingsFormData);
      expect(result.success).toBe(true);

      // Verify item deadline unchanged
      const itemsAfter = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx
          .select()
          .from(deliveryItems)
          .where(eq(deliveryItems.user_id, testUser1Id));
      });

      expect(itemsAfter.length).toBe(1);
      expect(itemsAfter[0].computed_deadline.toISOString()).toBe(
        deadlineBefore
      );
    });
  });

  describe('updateSettingsAction - Validation', () => {
    test('returns error for invalid deadline_days (0)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('default_deadline_days', '0');

      const result = await updateSettingsAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/at least 1 day/i);
      }
    });

    test('returns error for invalid deadline_days (366)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('default_deadline_days', '366');

      const result = await updateSettingsAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/at most 365 days/i);
      }
    });

    test('returns error when no fields provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      // Empty FormData (no fields)
      const formData = new FormData();

      const result = await updateSettingsAction(formData);

      expect(result.success).toBe(false);
      // Should fail schema refinement check
    });
  });
});
