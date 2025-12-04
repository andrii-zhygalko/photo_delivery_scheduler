import { db } from '@/lib/db';
import { userSettings, deliveryItems } from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTransaction = typeof db | DbTransaction;

export async function getUserSettings(
  userId: string,
  tx: DbOrTransaction = db
) {
  const [settings] = await tx
    .select()
    .from(userSettings)
    .where(eq(userSettings.user_id, userId));

  return settings;
}

export async function getItemsForUser(
  userId: string,
  filters?: {
    status?: 'TO_DO' | 'EDITING' | 'DELIVERED';
    isArchived?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
  },
  tx: DbOrTransaction = db
) {
  // Build where conditions
  const conditions = [eq(deliveryItems.user_id, userId)];

  // Add status filter if provided
  if (filters?.status) {
    conditions.push(eq(deliveryItems.status, filters.status));
  }

  // Add is_archived filter if provided
  if (filters?.isArchived !== undefined) {
    conditions.push(eq(deliveryItems.is_archived, filters.isArchived));
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
