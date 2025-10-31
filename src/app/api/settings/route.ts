import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { updateSettingsSchema } from '@/lib/api/schemas';
import { userSettings } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { isValidTimezone } from '@/lib/timezone-detector';
import { ZodError } from 'zod';

/**
 * POST /api/settings
 * Update user settings (default_deadline_days, timezone)
 * Optionally apply changes to existing items with applyToExisting flag
 */
export async function POST(request: Request) {
  return withAuth(async (session, tx) => {
    try {
      const body = await request.json();

      // Validate input
      const parseResult = updateSettingsSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: 'Invalid input',
            details: parseResult.error.issues,
          },
          { status: 400 }
        );
      }

      const { default_deadline_days, timezone, applyToExisting } =
        parseResult.data;

      // Validate timezone if provided (using Intl API)
      if (timezone && !isValidTimezone(timezone)) {
        return NextResponse.json(
          {
            error:
              'Invalid timezone. Must be a valid IANA timezone name (e.g., America/New_York, Europe/Rome)',
          },
          { status: 400 }
        );
      }

      // Build update object
      const updates: {
        default_deadline_days?: number;
        timezone?: string;
        updated_at: Date;
      } = {
        updated_at: new Date(),
      };

      if (default_deadline_days !== undefined) {
        updates.default_deadline_days = default_deadline_days;
      }

      if (timezone !== undefined) {
        updates.timezone = timezone;
      }

      // Update user settings
      const [updatedSettings] = await tx
        .update(userSettings)
        .set(updates)
        .where(eq(userSettings.user_id, session.user.id))
        .returning();

      if (!updatedSettings) {
        return NextResponse.json(
          { error: 'Settings not found' },
          { status: 404 }
        );
      }

      // If applyToExisting, recalculate all non-archived items
      let recalculatedCount = 0;
      if (applyToExisting) {
        const result = await tx.execute(sql`
          WITH updated_items AS (
            UPDATE delivery_items di
            SET
              computed_deadline = (
                (di.shoot_date::timestamptz AT TIME ZONE us.timezone) +
                (us.default_deadline_days || ' days')::INTERVAL +
                INTERVAL '23 hours 59 minutes'
              ) AT TIME ZONE us.timezone,
              custom_deadline = (
                (di.shoot_date::timestamptz AT TIME ZONE us.timezone) +
                (us.default_deadline_days || ' days')::INTERVAL +
                INTERVAL '23 hours 59 minutes'
              ) AT TIME ZONE us.timezone,
              updated_at = NOW()
            FROM user_settings us
            WHERE di.user_id = ${session.user.id}::uuid
              AND us.user_id = di.user_id
              AND di.status != 'ARCHIVED'
            RETURNING di.id
          )
          SELECT COUNT(*) as count FROM updated_items
        `);

        recalculatedCount = Number(result.rows[0]?.count || 0);
      }

      return NextResponse.json({
        success: true,
        settings: updatedSettings,
        recalculatedCount,
      });
    } catch (error) {
      console.error('Settings update error:', error);

      // Handle Zod errors (shouldn't happen after safeParse, but defensive)
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.issues },
          { status: 400 }
        );
      }

      // Handle other errors
      return NextResponse.json(
        {
          error: 'Failed to update settings',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
