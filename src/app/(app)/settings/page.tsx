import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getUserSettings } from '@/lib/db/queries';
import { deliveryItems } from '@/lib/db/schema';
import { SettingsPageClient } from '@/components/settings-page-client';
import { sql, eq } from 'drizzle-orm';

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;

  // Fetch user settings and count non-archived items
  const { userSettings, itemCount } = await db.transaction(async tx => {
    // Set GUC for RLS
    await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

    // Fetch user settings
    const settings = await getUserSettings(userId, tx);

    if (!settings) {
      throw new Error('User settings not found');
    }

    // Count non-archived items (for recalculation preview)
    const items = await tx
      .select()
      .from(deliveryItems)
      .where(eq(deliveryItems.user_id, userId));

    const nonArchivedCount = items.filter(
      item => item.status !== 'ARCHIVED'
    ).length;

    return {
      userSettings: settings,
      itemCount: nonArchivedCount,
    };
  });

  return (
    <div className='container max-w-2xl py-8 px-4'>
      <div className='space-y-6'>
        {/* Header */}
        <div>
          <h1 className='text-3xl font-bold'>Settings</h1>
          <p className='text-muted-foreground mt-2'>
            Manage your default deadline settings and timezone preferences
          </p>
        </div>

        {/* Settings Form */}
        <SettingsPageClient
          currentSettings={userSettings}
          itemCount={itemCount}
        />
      </div>
    </div>
  );
}
