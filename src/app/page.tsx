import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect('/items');
  } else {
    redirect('/auth/signin');
  }
}
