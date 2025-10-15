import { db } from '@/lib/db';
import { users, deliveryItems } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Create a test user with settings using the SECURITY DEFINER function
 */
export async function createTestUser(overrides?: {
  email?: string;
  name?: string;
  timezone?: string;
  defaultDeadlineDays?: number;
}) {
  const email = overrides?.email || `test-${Date.now()}@example.com`;
  const name = overrides?.name || 'Test User';

  // Use the SECURITY DEFINER function to create user (bypasses RLS)
  const result = await db.execute<{ user_id: string }>(sql`
    SELECT auth_upsert_user(${email}, ${name}, NULL) as user_id
  `);

  const userId = result.rows[0].user_id;

  // Update settings if needed
  if (overrides?.timezone || overrides?.defaultDeadlineDays) {
    await db.execute(sql`
      UPDATE user_settings
      SET timezone = ${overrides.timezone || 'UTC'},
          default_deadline_days = ${overrides.defaultDeadlineDays || 30}
      WHERE user_id = ${userId}
    `);
  }

  return { userId, email, name };
}

/**
 * Clean up test data after tests
 * Must set GUC for each user to bypass RLS during cleanup
 */
export async function cleanupTestUsers(userIds: string[]) {
  for (const userId of userIds) {
    await db.transaction(async (tx) => {
      // Set GUC to allow deletion
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));
      // Delete user (cascade will delete settings and items)
      await tx.delete(users).where(sql`id = ${userId}`);
    });
  }
}

/**
 * Create test delivery items for a user
 * Must be called with a transaction that has app.user_id GUC set!
 */
export async function createTestItems(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  count: number
) {
  const items = [];

  for (let i = 0; i < count; i++) {
    const shootDate = new Date();
    shootDate.setDate(shootDate.getDate() + i);

    const computedDeadline = new Date(shootDate);
    computedDeadline.setDate(computedDeadline.getDate() + 30);

    const [item] = await tx
      .insert(deliveryItems)
      .values({
        user_id: userId,
        client_name: `Test Client ${i + 1}`,
        shoot_date: shootDate.toISOString().split('T')[0],
        computed_deadline: computedDeadline,
        custom_deadline: null,
        notes: `Test notes ${i + 1}`,
        status: 'TO_DO',
      })
      .returning();

    items.push(item);
  }

  return items;
}
