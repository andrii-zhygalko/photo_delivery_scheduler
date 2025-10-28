import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { deliveryItems } from '@/lib/db/schema';
import { createTestUser, createTestItems, cleanupTestUsers } from '../helpers/db';
import { eq, sql } from 'drizzle-orm';

describe('Row-Level Security (RLS) Policies', () => {
  let user1: { userId: string; email: string; name: string };
  let user2: { userId: string; email: string; name: string };
  let user2ItemIds: string[];

  beforeAll(async () => {
    // Create two test users with unique emails to prevent data pollution
    const timestamp = Date.now();
    user1 = await createTestUser({ email: `user1-${timestamp}@test.com` });
    user2 = await createTestUser({ email: `user2-${timestamp}@test.com` });

    // Create items for each user (must set GUC first, use sql.raw for SET commands)
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user1.userId}'`));
      return createTestItems(tx, user1.userId, 3);
    });

    const user2Items = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user2.userId}'`));
      return createTestItems(tx, user2.userId, 2);
    });

    user2ItemIds = user2Items.map((item) => item.id);
  });

  afterAll(async () => {
    // Clean up test users (cascade deletes items)
    await cleanupTestUsers([user1.userId, user2.userId]);
  });

  test('User 1 can only see their own items', async () => {
    await db.transaction(async (tx) => {
      // Set GUC for user 1 (use sql.raw for SET commands)
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user1.userId}'`));

      // Query all items
      const items = await tx.select().from(deliveryItems);

      // Should only see user 1's items
      expect(items).toHaveLength(3);
      expect(items.every((item) => item.user_id === user1.userId)).toBe(true);
    });
  });

  test('User 2 can only see their own items', async () => {
    await db.transaction(async (tx) => {
      // Set GUC for user 2 (use sql.raw for SET commands)
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user2.userId}'`));

      // Query all items
      const items = await tx.select().from(deliveryItems);

      // Should only see user 2's items
      expect(items).toHaveLength(2);
      expect(items.every((item) => item.user_id === user2.userId)).toBe(true);
    });
  });

  test('User 1 cannot read User 2 items by ID', async () => {
    await db.transaction(async (tx) => {
      // Set GUC for user 1 (use sql.raw for SET commands)
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user1.userId}'`));

      // Try to read user 2's item
      const items = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, user2ItemIds[0]));

      // Should return empty (RLS blocks it)
      expect(items).toHaveLength(0);
    });
  });

  test('User 1 cannot update User 2 items', async () => {
    await db.transaction(async (tx) => {
      // Set GUC for user 1 (use sql.raw for SET commands)
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user1.userId}'`));

      // Try to update user 2's item
      const result = await tx
        .update(deliveryItems)
        .set({ client_name: 'Hacked!' })
        .where(eq(deliveryItems.id, user2ItemIds[0]))
        .returning();

      // Should return empty (RLS blocks it)
      expect(result).toHaveLength(0);
    });

    // Verify item was not updated
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user2.userId}'`));
      const [item] = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, user2ItemIds[0]));

      expect(item.client_name).not.toBe('Hacked!');
    });
  });

  test('User 1 cannot delete User 2 items', async () => {
    await db.transaction(async (tx) => {
      // Set GUC for user 1 (use sql.raw for SET commands)
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user1.userId}'`));

      // Try to delete user 2's item
      const result = await tx
        .delete(deliveryItems)
        .where(eq(deliveryItems.id, user2ItemIds[0]))
        .returning();

      // Should return empty (RLS blocks it)
      expect(result).toHaveLength(0);
    });

    // Verify item still exists
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${user2.userId}'`));
      const items = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.id, user2ItemIds[0]));

      expect(items).toHaveLength(1);
    });
  });

  test('Query without GUC set returns no items', async () => {
    await db.transaction(async (tx) => {
      // Don't set GUC - should return nothing
      const items = await tx.select().from(deliveryItems);

      // RLS should block all results
      expect(items).toHaveLength(0);
    });
  });
});
