import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { Navbar } from '@/components/navbar';

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
    <div className="min-h-screen flex flex-col">
      <Navbar user={session.user} />
      <main className="flex-1 bg-gradient-page">{children}</main>
    </div>
  );
}
