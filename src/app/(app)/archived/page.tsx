import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getUserSettings, getItemsForUser } from '@/lib/db/queries';
import { ArchivedPageClient } from '@/components/archived-page-client';
import { sql } from 'drizzle-orm';

interface ArchivedPageProps {
  searchParams: Promise<{
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
}

export default async function ArchivedPage(props: ArchivedPageProps) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;

  // Await searchParams (Next.js 15 requirement)
  const searchParams = await props.searchParams;

  // Fetch data within RLS transaction
  const { items, userSettings } = await db.transaction(async tx => {
    // Set GUC for RLS
    await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

    // Parallelize database queries for better performance
    const [settings, itemsList] = await Promise.all([
      getUserSettings(userId, tx),
      getItemsForUser(
        userId,
        {
          isArchived: true, // Only show archived items
          sort: searchParams.sort,
          order: searchParams.order,
        },
        tx
      ),
    ]);

    return {
      items: itemsList,
      userSettings: settings,
    };
  });

  return (
    <div className='container py-4 px-4'>
      <ArchivedPageClient items={items} userSettings={userSettings} />
    </div>
  );
}
