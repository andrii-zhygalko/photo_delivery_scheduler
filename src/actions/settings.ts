'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { userSettings, deliveryItems } from '@/lib/db/schema';
import { updateSettingsSchema } from '@/lib/api/schemas';
import { eq, ne, and, sql } from 'drizzle-orm';
import { computeDeadline } from '@/lib/date-utils';
import type { ActionResult } from './items';

/**
 * Update user settings (default_deadline_days, timezone)
 * Server Action called from settings form
 * Optionally recalculates all existing items if applyToExisting=true
 */
export async function updateSettingsAction(
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    // 1. Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: 'You must be signed in' };
    }

    const userId = session.user.id; // Extract for type narrowing

    // 2. Parse and validate form data
    const rawData = {
      default_deadline_days: formData.get('default_deadline_days')
        ? Number(formData.get('default_deadline_days'))
        : undefined,
      timezone: formData.get('timezone')
        ? (formData.get('timezone') as string)
        : undefined,
      applyToExisting: formData.get('applyToExisting') === 'true',
    };

    const validated = updateSettingsSchema.parse(rawData);

    // 3. Update settings and optionally recalculate items
    await db.transaction(async (tx) => {
      // Set RLS context
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

      // Get current settings (for timezone if not being changed)
      const [currentSettings] = await tx
        .select()
        .from(userSettings)
        .where(eq(userSettings.user_id, userId));

      if (!currentSettings) {
        throw new Error('User settings not found');
      }

      // Determine final settings values
      const finalDeadlineDays =
        validated.default_deadline_days ?? currentSettings.default_deadline_days;
      const finalTimezone = validated.timezone ?? currentSettings.timezone;

      // Update user_settings table
      await tx
        .update(userSettings)
        .set({
          default_deadline_days:
            validated.default_deadline_days !== undefined
              ? validated.default_deadline_days
              : undefined,
          timezone: validated.timezone !== undefined ? validated.timezone : undefined,
          updated_at: new Date(),
        })
        .where(eq(userSettings.user_id, userId));

      // If applyToExisting is true, recalculate all non-archived items
      if (validated.applyToExisting) {
        // Fetch all non-archived items
        const items = await tx
          .select()
          .from(deliveryItems)
          .where(
            and(
              eq(deliveryItems.user_id, userId),
              ne(deliveryItems.status, 'ARCHIVED')
            )
          );

        // Recalculate each item's deadline
        for (const item of items) {
          const newComputedDeadline = computeDeadline(
            item.shoot_date,
            finalDeadlineDays,
            finalTimezone
          );

          // Update both computed_deadline and custom_deadline
          // Per spec: settings changes reset custom deadlines
          await tx
            .update(deliveryItems)
            .set({
              computed_deadline: new Date(newComputedDeadline),
              custom_deadline: new Date(newComputedDeadline),
              updated_at: new Date(),
            })
            .where(eq(deliveryItems.id, item.id));
        }
      }
    });

    // 4. Revalidate pages
    revalidatePath('/settings');
    revalidatePath('/items');
    revalidatePath('/archived');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Update settings error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update settings' };
  }
}
