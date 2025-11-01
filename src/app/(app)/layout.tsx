import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { Navbar } from '@/components/navbar';
import { BottomNav } from '@/components/bottom-nav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className='min-h-screen flex flex-col'>
      <Navbar user={session.user} />
      {/* Add bottom padding on mobile to account for bottom navigation (pb-24 = 96px) */}
      {/* On desktop (md:), no bottom padding needed (md:pb-0) */}
      <main className='flex-1 bg-gradient-page pb-20 md:pb-0'>{children}</main>

      {/* Bottom Navigation - Mobile only */}
      <BottomNav />
    </div>
  );
}
