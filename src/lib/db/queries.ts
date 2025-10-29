import { db } from '@/lib/db';
import { userSettings, deliveryItems } from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

/**
 * Fetch user settings (timezone, default_deadline_days)
 *
 * @param userId - User ID (UUID string)
 * @param tx - Optional database/transaction object (defaults to global db)
 * @returns User settings or undefined if not found
 */
export async function getUserSettings(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any = db
) {
  const [settings] = await tx
    .select()
    .from(userSettings)
    .where(eq(userSettings.user_id, userId));

  return settings;
}

/**
 * Fetch delivery items for a user with optional filtering and sorting
 *
 * IMPORTANT: Must be called within a transaction with GUC context set
 * Example:
 *   await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));
 *   const items = await getItemsForUser(userId, filters, tx);
 *
 * @param userId - User ID (UUID string)
 * @param filters - Optional filters: status, sort field, order
 * @param tx - Optional database/transaction object (defaults to global db)
 * @returns Array of delivery items
 */
export async function getItemsForUser(
  userId: string,
  filters?: {
    status?: 'TO_DO' | 'EDITING' | 'DELIVERED' | 'ARCHIVED';
    sort?: string;
    order?: 'asc' | 'desc';
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any = db
) {
  // Build where conditions
  const conditions = [eq(deliveryItems.user_id, userId)];

  // Add status filter if provided
  if (filters?.status) {
    conditions.push(eq(deliveryItems.status, filters.status));
  }

  // Determine sort field and order
  const sortField = filters?.sort || 'computed_deadline';
  const orderFn = filters?.order === 'desc' ? desc : asc;

  // Map sort field to actual column
  const sortColumn =
    sortField === 'shoot_date'
      ? deliveryItems.shoot_date
      : sortField === 'created_at'
      ? deliveryItems.created_at
      : deliveryItems.computed_deadline;

  // Execute query with conditions and sorting
  const items = await tx
    .select()
    .from(deliveryItems)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn));

  return items;
}
