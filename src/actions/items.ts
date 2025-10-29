'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { deliveryItems } from '@/lib/db/schema';
import { createItemSchema, updateItemSchema } from '@/lib/api/schemas';
import { eq, sql } from 'drizzle-orm';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new delivery item
 * Server Action called from item form dialog
 */
export async function createItemAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: 'You must be signed in' };
    }

    const userId = session.user.id; // Extract for type narrowing

    // 2. Parse and validate form data
    const rawData = {
      client_name: formData.get('client_name') as string,
      shoot_date: formData.get('shoot_date') as string,
      notes: (formData.get('notes') as string) || null,
      custom_deadline:
        formData.get('use_custom_deadline') === 'true'
          ? (formData.get('custom_deadline') as string) || null
          : null,
    };

    const validated = createItemSchema.parse(rawData);

    // 3. Insert with RLS context
    // Note: computed_deadline and custom_deadline are set automatically by database trigger
    // We provide a placeholder value that will be overwritten
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      const [item] = await tx
        .insert(deliveryItems)
        .values({
          user_id: userId,
          client_name: validated.client_name,
          shoot_date: validated.shoot_date,
          computed_deadline: new Date(), // Placeholder - overwritten by trigger
          notes: validated.notes,
          custom_deadline: validated.custom_deadline
            ? new Date(validated.custom_deadline)
            : null,
        })
        .returning();

      return { id: item.id };
    });

    // 4. Revalidate pages
    revalidatePath('/items');
    revalidatePath('/archived');

    return { success: true, data: result };
  } catch (error) {
    console.error('Create item error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create item' };
  }
}

/**
 * Update an existing delivery item
 * Server Action called from item form dialog
 */
export async function updateItemAction(
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: 'You must be signed in' };
    }

    const userId = session.user.id; // Extract for type narrowing

    // 2. Parse and validate form data
    const rawData = {
      client_name: formData.get('client_name') as string,
      shoot_date: formData.get('shoot_date') as string,
      notes: (formData.get('notes') as string) || null,
      status: formData.get('status') as
        | 'TO_DO'
        | 'EDITING'
        | 'DELIVERED'
        | 'ARCHIVED',
      custom_deadline:
        formData.get('use_custom_deadline') === 'true'
          ? (formData.get('custom_deadline') as string) || null
          : null,
    };

    const validated = updateItemSchema.parse(rawData);

    // 3. Convert custom_deadline to Date if provided
    const updateData: {
      client_name?: string;
      shoot_date?: string;
      notes?: string | null;
      status?: 'TO_DO' | 'EDITING' | 'DELIVERED' | 'ARCHIVED';
      custom_deadline?: Date | null;
      updated_at: Date;
    } = {
      ...validated,
      custom_deadline: validated.custom_deadline
        ? new Date(validated.custom_deadline)
        : null,
      updated_at: new Date(),
    };

    // 4. Update with RLS context
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      await tx
        .update(deliveryItems)
        .set(updateData)
        .where(eq(deliveryItems.id, itemId));
    });

    // 4. Revalidate pages
    revalidatePath('/items');
    revalidatePath('/archived');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Update item error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update item' };
  }
}

/**
 * Mark an item as delivered
 * Server Action called from quick action button
 */
export async function deliverItemAction(
  itemId: string
): Promise<ActionResult> {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: 'You must be signed in' };
    }

    const userId = session.user.id;

    // 2. Update with RLS context
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      await tx
        .update(deliveryItems)
        .set({
          status: 'DELIVERED',
          delivered_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(deliveryItems.id, itemId));
    });

    // 3. Revalidate pages
    revalidatePath('/items');
    revalidatePath('/archived');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Deliver item error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to mark item as delivered' };
  }
}

/**
 * Archive an item
 * Server Action called from quick action button
 */
export async function archiveItemAction(
  itemId: string
): Promise<ActionResult> {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: 'You must be signed in' };
    }

    const userId = session.user.id;

    // 2. Update with RLS context
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      await tx
        .update(deliveryItems)
        .set({
          status: 'ARCHIVED',
          updated_at: new Date(),
        })
        .where(eq(deliveryItems.id, itemId));
    });

    // 3. Revalidate pages
    revalidatePath('/items');
    revalidatePath('/archived');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Archive item error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to archive item' };
  }
}

/**
 * Delete an item permanently
 * Server Action called from quick action button
 */
export async function deleteItemAction(
  itemId: string
): Promise<ActionResult> {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: 'You must be signed in' };
    }

    const userId = session.user.id;

    // 2. Delete with RLS context
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      await tx.delete(deliveryItems).where(eq(deliveryItems.id, itemId));
    });

    // 3. Revalidate pages
    revalidatePath('/items');
    revalidatePath('/archived');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Delete item error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete item' };
  }
}
