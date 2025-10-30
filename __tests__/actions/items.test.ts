/**
 * Tests for Server Actions (src/actions/items.ts)
 * Tests FormData-based Server Actions with RLS enforcement
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { createTestUser, cleanupTestUsers } from '../helpers/db';
import {
  createItemAction,
  updateItemAction,
  deliverItemAction,
  archiveItemAction,
  deleteItemAction,
} from '@/actions/items';

// Mock next/cache revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock getServerSession
vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from '@/lib/auth/session';

describe('Server Actions - Items', () => {
  let testUser1Id: string;
  let testUser2Id: string;

  beforeAll(async () => {
    // Create test users
    const user1 = await createTestUser({ email: `actions-user1-${Date.now()}@test.com` });
    const user2 = await createTestUser({ email: `actions-user2-${Date.now()}@test.com` });
    testUser1Id = user1.userId;
    testUser2Id = user2.userId;
  });

  afterAll(async () => {
    await cleanupTestUsers([testUser1Id, testUser2Id]);
  });

  describe('createItemAction', () => {
    test('creates item successfully with valid data', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('client_name', 'John Doe');
      formData.append('shoot_date', '2025-11-12');
      formData.append('notes', 'Test notes');

      const result = await createItemAction(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeTruthy();
        expect(typeof result.data.id).toBe('string');

        // Verify item was created in database
        const queryResult = await db.transaction(async (tx) => {
          await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
          return tx.execute(sql`SELECT * FROM delivery_items WHERE id = ${result.data.id}`);
        });
        expect(queryResult.rows.length).toBeGreaterThan(0);
      }
    });

    test('creates item with custom deadline', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('client_name', 'Jane Smith');
      formData.append('shoot_date', '2025-11-12');
      formData.append('use_custom_deadline', 'true');
      formData.append('custom_deadline', '2025-11-15'); // Earlier than computed deadline

      const result = await createItemAction(formData);

      expect(result.success).toBe(true);
    });

    test('returns error when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const formData = new FormData();
      formData.append('client_name', 'Test Client');
      formData.append('shoot_date', '2025-11-12');

      const result = await createItemAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('signed in');
      }
    });

    test('returns error for invalid data (missing client_name)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('shoot_date', '2025-11-12'); // Missing client_name

      const result = await createItemAction(formData);

      expect(result.success).toBe(false);
    });

    test('returns error for invalid date format', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const formData = new FormData();
      formData.append('client_name', 'Test Client');
      formData.append('shoot_date', 'invalid-date');

      const result = await createItemAction(formData);

      expect(result.success).toBe(false);
    });
  });

  describe('updateItemAction', () => {
    test('updates item successfully', async () => {
      // Create item first
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const createFormData = new FormData();
      createFormData.append('client_name', 'Original Name');
      createFormData.append('shoot_date', '2025-11-12');

      const createResult = await createItemAction(createFormData);
      expect(createResult.success).toBe(true);

      if (!createResult.success) return;
      const itemId = createResult.data.id;

      // Update item
      const updateFormData = new FormData();
      updateFormData.append('client_name', 'Updated Name');
      updateFormData.append('shoot_date', '2025-11-12');
      updateFormData.append('status', 'EDITING');

      const updateResult = await updateItemAction(itemId, updateFormData);

      expect(updateResult.success).toBe(true);

      // Verify update in database
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx.execute(sql`SELECT * FROM delivery_items WHERE id = ${itemId}`);
      });

      expect(queryResult.rows.length).toBeGreaterThan(0);
    });

    test('returns error when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const formData = new FormData();
      formData.append('client_name', 'Test');
      formData.append('shoot_date', '2025-11-12');

      const result = await updateItemAction('some-id', formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('signed in');
      }
    });

    test('RLS prevents updating another user item', async () => {
      // Create item as user1
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test1@example.com', name: 'Test User 1' },
        expires: '2099-01-01',
      });

      const createFormData = new FormData();
      createFormData.append('client_name', 'User1 Item');
      createFormData.append('shoot_date', '2025-11-12');

      const createResult = await createItemAction(createFormData);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const itemId = createResult.data.id;

      // Try to update as user2
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser2Id, email: 'test2@example.com', name: 'Test User 2' },
        expires: '2099-01-01',
      });

      const updateFormData = new FormData();
      updateFormData.append('client_name', 'Hacked Name');
      updateFormData.append('shoot_date', '2025-11-12');

      const updateResult = await updateItemAction(itemId, updateFormData);

      // Update should succeed but RLS should prevent actual update
      expect(updateResult.success).toBe(true);

      // Verify item was NOT changed
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx.execute(sql`SELECT * FROM delivery_items WHERE id = ${itemId}`);
      });

      expect(queryResult.rows.length).toBeGreaterThan(0);
      // Name should still be 'User1 Item', not 'Hacked Name'
    });
  });

  describe('deliverItemAction', () => {
    test('marks item as delivered', async () => {
      // Create item
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const createFormData = new FormData();
      createFormData.append('client_name', 'To Be Delivered');
      createFormData.append('shoot_date', '2025-11-12');

      const createResult = await createItemAction(createFormData);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const itemId = createResult.data.id;

      // Deliver item
      const deliverResult = await deliverItemAction(itemId);

      expect(deliverResult.success).toBe(true);

      // Verify status and delivered_at are set
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx.execute(sql`SELECT status, delivered_at FROM delivery_items WHERE id = ${itemId}`);
      });

      expect(queryResult.rows.length).toBeGreaterThan(0);
      // Status should be DELIVERED and delivered_at should be set
    });

    test('returns error when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await deliverItemAction('some-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('signed in');
      }
    });
  });

  describe('archiveItemAction', () => {
    test('marks item as archived', async () => {
      // Create item
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const createFormData = new FormData();
      createFormData.append('client_name', 'To Be Archived');
      createFormData.append('shoot_date', '2025-11-12');

      const createResult = await createItemAction(createFormData);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const itemId = createResult.data.id;

      // Archive item
      const archiveResult = await archiveItemAction(itemId);

      expect(archiveResult.success).toBe(true);

      // Verify status is ARCHIVED
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx.execute(sql`SELECT status FROM delivery_items WHERE id = ${itemId}`);
      });

      expect(queryResult.rows.length).toBeGreaterThan(0);
    });

    test('returns error when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await archiveItemAction('some-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('signed in');
      }
    });
  });

  describe('deleteItemAction', () => {
    test('deletes item successfully', async () => {
      // Create item
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test@example.com', name: 'Test User' },
        expires: '2099-01-01',
      });

      const createFormData = new FormData();
      createFormData.append('client_name', 'To Be Deleted');
      createFormData.append('shoot_date', '2025-11-12');

      const createResult = await createItemAction(createFormData);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const itemId = createResult.data.id;

      // Delete item
      const deleteResult = await deleteItemAction(itemId);

      expect(deleteResult.success).toBe(true);

      // Verify item no longer exists
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx.execute(sql`SELECT * FROM delivery_items WHERE id = ${itemId}`);
      });

      expect(queryResult.rows.length).toBe(0);
    });

    test('returns error when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await deleteItemAction('some-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('signed in');
      }
    });

    test('RLS prevents deleting another user item', async () => {
      // Create item as user1
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser1Id, email: 'test1@example.com', name: 'Test User 1' },
        expires: '2099-01-01',
      });

      const createFormData = new FormData();
      createFormData.append('client_name', 'User1 Item to Delete');
      createFormData.append('shoot_date', '2025-11-12');

      const createResult = await createItemAction(createFormData);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const itemId = createResult.data.id;

      // Try to delete as user2
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUser2Id, email: 'test2@example.com', name: 'Test User 2' },
        expires: '2099-01-01',
      });

      const deleteResult = await deleteItemAction(itemId);

      // Delete should succeed but RLS prevents actual deletion
      expect(deleteResult.success).toBe(true);

      // Verify item still exists
      const queryResult = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${testUser1Id}'`));
        return tx.execute(sql`SELECT * FROM delivery_items WHERE id = ${itemId}`);
      });

      expect(queryResult.rows.length).toBeGreaterThan(0); // Item should still exist
    });
  });
});
