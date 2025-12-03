import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getUserSettings } from '@/lib/db/queries';
import { Navbar } from '@/components/navbar';
import { BottomNav } from '@/components/bottom-nav';
import { ThemeSync } from '@/components/theme-sync';
import { sql } from 'drizzle-orm';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Fetch user's theme preference for cross-device sync
  const settings = await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.user_id = '${session.user.id}'`));
    return await getUserSettings(session.user.id, tx);
  });

  return (
    <div className='min-h-screen flex flex-col'>
      {/* Sync database theme to next-themes on initial load */}
      <ThemeSync serverTheme={settings?.theme_mode} />

      <Navbar user={session.user} />
      {/* Add bottom padding on mobile to account for bottom navigation (pb-24 = 96px) */}
      {/* On desktop (md:), no bottom padding needed (md:pb-0) */}
      <main className='flex-1 w-full bg-gradient-page pb-20 md:pb-0 flex justify-center'>{children}</main>

      {/* Bottom Navigation - Mobile only */}
      <BottomNav />
    </div>
  );
}
