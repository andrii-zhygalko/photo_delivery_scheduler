import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getUserSettings, getItemsForUser } from '@/lib/db/queries';
import { ItemsList } from '@/components/items-list';
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
  const { items, userSettings } = await db.transaction(async (tx) => {
    // Set GUC for RLS
    await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

    // Fetch user settings
    const settings = await getUserSettings(userId, tx);

    // Fetch only archived items
    const itemsList = await getItemsForUser(
      userId,
      {
        status: 'ARCHIVED',
        sort: searchParams.sort,
        order: searchParams.order,
      },
      tx
    );

    return {
      items: itemsList,
      userSettings: settings,
    };
  });

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Archived Items</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} archived {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <ItemsList items={items} userTimezone={userSettings.timezone} />
    </div>
  );
}
