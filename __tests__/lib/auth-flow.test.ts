import { describe, test, expect, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { users, userSettings } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { cleanupTestUsers } from '../helpers/db';

describe('Authentication Flow', () => {
  const testUserIds: string[] = [];

  afterAll(async () => {
    await cleanupTestUsers(testUserIds);
  });

  test('New user sign-in creates user record', async () => {
    const email = `new-user-${Date.now()}@test.com`;
    const name = 'New Test User';

    // Call SECURITY DEFINER function (simulates OAuth callback)
    const result = await db.execute<{ user_id: string }>(sql`
      SELECT auth_upsert_user(${email}, ${name}, NULL) as user_id
    `);

    const userId = result.rows[0].user_id;
    testUserIds.push(userId);

    // Verify user exists (set GUC to bypass RLS for verification)
    const [user] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));
      return tx.select().from(users).where(eq(users.id, userId));
    });

    expect(user).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.name).toBe(name);
  });

  test('User settings initialized with defaults', async () => {
    const email = `settings-user-${Date.now()}@test.com`;
    const name = 'Settings Test User';

    // Create user
    const result = await db.execute<{ user_id: string }>(sql`
      SELECT auth_upsert_user(${email}, ${name}, NULL) as user_id
    `);

    const userId = result.rows[0].user_id;
    testUserIds.push(userId);

    // Verify settings exist (set GUC to bypass RLS for verification)
    const [settings] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));
      return tx.select().from(userSettings).where(eq(userSettings.user_id, userId));
    });

    expect(settings).toBeDefined();
    expect(settings.default_deadline_days).toBe(30);
    expect(settings.timezone).toBe('UTC');
  });

  test('Existing user sign-in does not create duplicate', async () => {
    const email = `existing-user-${Date.now()}@test.com`;
    const name = 'Existing User';

    // First sign-in
    const result1 = await db.execute<{ user_id: string }>(sql`
      SELECT auth_upsert_user(${email}, ${name}, NULL) as user_id
    `);
    const userId1 = result1.rows[0].user_id;
    testUserIds.push(userId1);

    // Second sign-in (same email)
    const result2 = await db.execute<{ user_id: string }>(sql`
      SELECT auth_upsert_user(${email}, 'Updated Name', 'http://image.jpg') as user_id
    `);
    const userId2 = result2.rows[0].user_id;

    // Should return same user ID
    expect(userId1).toBe(userId2);

    // Verify only one user record exists (set GUC to bypass RLS for verification)
    const allUsers = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId1}'`));
      return tx.select().from(users).where(eq(users.email, email));
    });

    expect(allUsers).toHaveLength(1);

    // Verify user was updated (not duplicated)
    expect(allUsers[0].name).toBe('Updated Name');
    expect(allUsers[0].image).toBe('http://image.jpg');
  });

  test('User settings persist across multiple sign-ins', async () => {
    const email = `persistent-user-${Date.now()}@test.com`;
    const name = 'Persistent User';

    // First sign-in
    const result1 = await db.execute<{ user_id: string }>(sql`
      SELECT auth_upsert_user(${email}, ${name}, NULL) as user_id
    `);
    const userId = result1.rows[0].user_id;
    testUserIds.push(userId);

    // Update settings (set GUC to bypass RLS)
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));
      await tx
        .update(userSettings)
        .set({ default_deadline_days: 45, timezone: 'America/New_York' })
        .where(eq(userSettings.user_id, userId));
    });

    // Second sign-in
    await db.execute(sql`
      SELECT auth_upsert_user(${email}, ${name}, NULL) as user_id
    `);

    // Verify settings unchanged (set GUC to bypass RLS for verification)
    const [settings] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));
      return tx.select().from(userSettings).where(eq(userSettings.user_id, userId));
    });

    expect(settings.default_deadline_days).toBe(45);
    expect(settings.timezone).toBe('America/New_York');
  });
});
