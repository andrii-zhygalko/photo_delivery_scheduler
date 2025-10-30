/**
 * E2E Workflow Tests
 * Tests complete item lifecycle and workflows
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { sql, eq, ne, and } from 'drizzle-orm';
import { deliveryItems, userSettings } from '@/lib/db/schema';
import { createTestUser, cleanupTestUsers } from '../helpers/db';
import {
  createItemAction,
  updateItemAction,
  deliverItemAction,
  archiveItemAction,
  deleteItemAction,
} from '@/actions/items';
import { updateSettingsAction } from '@/actions/settings';
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

describe('E2E - Items Workflow', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await createTestUser({
      email: `e2e-workflow-${Date.now()}@test.com`,
    });
    testUserId = user.userId;
  });

  afterAll(async () => {
    await cleanupTestUsers([testUserId]);
  });

  test('Complete item lifecycle: Create → Edit → Deliver → Archive → Delete', async () => {
    // Mock session once at start
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: testUserId, email: 'e2e@test.com', name: 'E2E User' },
      expires: '2099-01-01',
    });

    // STEP 1: Create item
    const createFormData = new FormData();
    createFormData.append('client_name', 'E2E Test Client');
    createFormData.append('shoot_date', '2025-11-20');
    createFormData.append('notes', 'E2E test notes');

    const createResult = await createItemAction(createFormData);
    expect(createResult.success).toBe(true);

    if (!createResult.success) {
      throw new Error('Failed to create item for E2E test');
    }

    const itemId = createResult.data.id;

    // STEP 2: Verify item created with correct status
    let item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item).toBeTruthy();
    expect(item.status).toBe('TO_DO');
    expect(item.client_name).toBe('E2E Test Client');
    expect(item.notes).toBe('E2E test notes');
    expect(item.computed_deadline).toBeTruthy();
    expect(item.custom_deadline).toBeTruthy();
    expect(item.delivered_at).toBeNull();

    // STEP 3: Edit item (change client name, set status to EDITING)
    const updateFormData = new FormData();
    updateFormData.append('client_name', 'E2E Updated Client');
    updateFormData.append('shoot_date', '2025-11-20');
    updateFormData.append('status', 'EDITING');
    updateFormData.append('notes', 'Updated notes');

    const updateResult = await updateItemAction(itemId, updateFormData);
    expect(updateResult.success).toBe(true);

    // STEP 4: Verify update persisted
    item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.status).toBe('EDITING');
    expect(item.client_name).toBe('E2E Updated Client');
    expect(item.notes).toBe('Updated notes');

    // STEP 5: Mark as delivered
    const deliverResult = await deliverItemAction(itemId);
    expect(deliverResult.success).toBe(true);

    // STEP 6: Verify delivered status and delivered_at timestamp
    item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.status).toBe('DELIVERED');
    expect(item.delivered_at).toBeTruthy();
    expect(item.delivered_at).toBeInstanceOf(Date);

    // STEP 7: Archive item
    const archiveResult = await archiveItemAction(itemId);
    expect(archiveResult.success).toBe(true);

    // STEP 8: Verify archived status
    item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.status).toBe('ARCHIVED');

    // STEP 9: Delete item
    const deleteResult = await deleteItemAction(itemId);
    expect(deleteResult.success).toBe(true);

    // STEP 10: Verify item deleted
    const deletedItem = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result;
    });

    expect(deletedItem.length).toBe(0);
  });

  test('Item with custom deadline persists through updates', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: testUserId, email: 'e2e@test.com', name: 'E2E User' },
      expires: '2099-01-01',
    });

    // Create item (custom_deadline will be set to computed_deadline by trigger)
    const createFormData = new FormData();
    createFormData.append('client_name', 'Custom Deadline Test');
    createFormData.append('shoot_date', '2025-11-20');

    const createResult = await createItemAction(createFormData);
    expect(createResult.success).toBe(true);

    if (!createResult.success) {
      throw new Error('Failed to create item');
    }

    const itemId = createResult.data.id;

    // Set custom deadline via update (trigger preserves custom_deadline on UPDATE if shoot_date unchanged)
    const setCustomDeadlineFormData = new FormData();
    setCustomDeadlineFormData.append('client_name', 'Custom Deadline Test');
    setCustomDeadlineFormData.append('shoot_date', '2025-11-20'); // Same date
    setCustomDeadlineFormData.append('status', 'TO_DO');
    setCustomDeadlineFormData.append('use_custom_deadline', 'true');
    setCustomDeadlineFormData.append('custom_deadline', '2025-11-25'); // Earlier than computed

    await updateItemAction(itemId, setCustomDeadlineFormData);

    // Get initial deadlines after setting custom deadline
    let item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.custom_deadline).toBeTruthy();
    const initialCustomDeadline = item.custom_deadline!.toISOString();
    const initialComputedDeadline = item.computed_deadline.toISOString();

    // Custom deadline should now be '2025-11-25T00:00:00.000Z' (as set)
    // Computed deadline remains '2025-12-20T23:59:00.000Z' (30 days from shoot_date)
    expect(initialCustomDeadline).toBe('2025-11-25T00:00:00.000Z');
    expect(item.custom_deadline).toBeTruthy();
    expect(item.custom_deadline! < item.computed_deadline).toBe(true); // Custom is earlier

    // Update item (preserve custom deadline by including use_custom_deadline flag)
    const updateFormData = new FormData();
    updateFormData.append('client_name', 'Updated Name');
    updateFormData.append('shoot_date', '2025-11-20'); // Same shoot date
    updateFormData.append('status', 'EDITING');
    updateFormData.append('use_custom_deadline', 'true');
    updateFormData.append('custom_deadline', '2025-11-25'); // Keep same custom deadline

    await updateItemAction(itemId, updateFormData);

    // Verify custom deadline preserved
    item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.custom_deadline).toBeTruthy();
    expect(item.custom_deadline!.toISOString()).toBe(initialCustomDeadline);
    expect(item.computed_deadline.toISOString()).toBe(initialComputedDeadline);

    // Update shoot_date (should reset deadlines)
    const updateShootDateFormData = new FormData();
    updateShootDateFormData.append('client_name', 'Updated Name');
    updateShootDateFormData.append('shoot_date', '2025-12-01'); // Different shoot date
    updateShootDateFormData.append('status', 'EDITING');

    await updateItemAction(itemId, updateShootDateFormData);

    // Verify deadlines recalculated
    item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    // Deadlines should be different now (based on new shoot date)
    expect(item.custom_deadline).toBeTruthy();
    expect(item.custom_deadline!.toISOString()).not.toBe(initialCustomDeadline);
    expect(item.computed_deadline.toISOString()).not.toBe(
      initialComputedDeadline
    );

    // Cleanup
    await deleteItemAction(itemId);
  });

  test('Status transitions follow expected flow', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: testUserId, email: 'e2e@test.com', name: 'E2E User' },
      expires: '2099-01-01',
    });

    // Create item (starts as TO_DO)
    const createFormData = new FormData();
    createFormData.append('client_name', 'Status Flow Test');
    createFormData.append('shoot_date', '2025-11-15');

    const createResult = await createItemAction(createFormData);
    expect(createResult.success).toBe(true);

    if (!createResult.success) {
      throw new Error('Failed to create item');
    }

    const itemId = createResult.data.id;

    // Verify initial status
    let item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.status).toBe('TO_DO');
    expect(item.delivered_at).toBeNull();

    // Update to EDITING
    const updateFormData = new FormData();
    updateFormData.append('client_name', 'Status Flow Test');
    updateFormData.append('shoot_date', '2025-11-15');
    updateFormData.append('status', 'EDITING');

    await updateItemAction(itemId, updateFormData);

    item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.status).toBe('EDITING');
    expect(item.delivered_at).toBeNull(); // Still null

    // Deliver (sets delivered_at)
    await deliverItemAction(itemId);

    item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.status).toBe('DELIVERED');
    expect(item.delivered_at).toBeTruthy();
    expect(item.delivered_at).toBeInstanceOf(Date);

    // Archive
    await archiveItemAction(itemId);

    item = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      const result = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, itemId));
      return result[0];
    });

    expect(item.status).toBe('ARCHIVED');
    // delivered_at should still be set
    expect(item.delivered_at).toBeTruthy();

    // Cleanup
    await deleteItemAction(itemId);
  });

  test('Settings change with recalculation affects existing items', async () => {
    // Reset user settings to known state
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      await tx
        .update(userSettings)
        .set({ default_deadline_days: 30, timezone: 'UTC' })
        .where(eq(userSettings.user_id, testUserId));

      // Clean up any existing items
      await tx.delete(deliveryItems).where(eq(deliveryItems.user_id, testUserId));
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: testUserId, email: 'e2e@test.com', name: 'E2E User' },
      expires: '2099-01-01',
    });

    // Create 2 items with default settings (30 days, UTC)
    const createFormData1 = new FormData();
    createFormData1.append('client_name', 'Recalc Item 1');
    createFormData1.append('shoot_date', '2025-11-10');
    const item1Result = await createItemAction(createFormData1);

    const createFormData2 = new FormData();
    createFormData2.append('client_name', 'Recalc Item 2');
    createFormData2.append('shoot_date', '2025-11-20');
    const item2Result = await createItemAction(createFormData2);

    expect(item1Result.success).toBe(true);
    expect(item2Result.success).toBe(true);

    // Verify initial deadlines (30 days from shoot date)
    const itemsBefore = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.user_id, testUserId));
    });

    expect(itemsBefore.length).toBe(2);

    for (const item of itemsBefore) {
      const expectedDeadline = computeDeadline(item.shoot_date, 30, 'UTC');
      expect(item.computed_deadline.toISOString()).toBe(expectedDeadline);
    }

    // Change settings to 60 days with recalculation
    const settingsFormData = new FormData();
    settingsFormData.append('default_deadline_days', '60');
    settingsFormData.append('applyToExisting', 'true');

    const settingsResult = await updateSettingsAction(settingsFormData);
    expect(settingsResult.success).toBe(true);

    // Verify both items recalculated to 60 days
    const itemsAfter = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUserId}'`));
      return tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.user_id, testUserId));
    });

    expect(itemsAfter.length).toBe(2);

    for (const item of itemsAfter) {
      const expectedDeadline = computeDeadline(item.shoot_date, 60, 'UTC');
      expect(item.computed_deadline.toISOString()).toBe(expectedDeadline);
      // Custom deadline should also be reset
      expect(item.custom_deadline).toBeTruthy();
      expect(item.custom_deadline!.toISOString()).toBe(expectedDeadline);
    }
  });
});
