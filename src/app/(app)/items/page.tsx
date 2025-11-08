import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getUserSettings, getItemsForUser } from '@/lib/db/queries';
import { ItemsFilter } from '@/components/items-filter';
import { ItemsPageClient } from '@/components/items-page-client';
import { sql } from 'drizzle-orm';
import type { DeliveryItem } from '@/lib/db/schema';

interface ItemsPageProps {
  searchParams: Promise<{
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
}

export default async function ItemsPage(props: ItemsPageProps) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;

  // Await searchParams (Next.js 15 requirement)
  const searchParams = await props.searchParams;

  // Parse filter values for passing to client components
  const currentStatus = searchParams.status || 'all';
  const currentSort = (searchParams.sort as string) || 'deadline';
  const currentOrder = (searchParams.order as 'asc' | 'desc') || 'asc';

  // Fetch data within RLS transaction
  const { items, userSettings } = await db.transaction(async tx => {
    // Set GUC for RLS
    await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

    // Fetch user settings
    const settings = await getUserSettings(userId, tx);

    // Parse and validate status filter
    const statusFilter =
      searchParams.status === 'TO_DO' ||
      searchParams.status === 'EDITING' ||
      searchParams.status === 'DELIVERED' ||
      searchParams.status === 'ARCHIVED'
        ? searchParams.status
        : undefined;

    // Fetch items with filters
    const itemsList = await getItemsForUser(
      userId,
      {
        status: statusFilter,
        sort: searchParams.sort,
        order: searchParams.order,
      },
      tx
    );

    // Filter out archived items unless explicitly filtering for them
    const filteredItems = itemsList.filter((item: DeliveryItem) =>
      statusFilter === 'ARCHIVED'
        ? item.status === 'ARCHIVED'
        : item.status !== 'ARCHIVED'
    );

    return {
      items: filteredItems,
      userSettings: settings,
    };
  });

  return (
    <div className='container py-4 px-4'>
      <ItemsFilter
        currentStatus={currentStatus}
        currentSort={currentSort}
        currentOrder={currentOrder}
      />
      <ItemsPageClient items={items} userSettings={userSettings} />
    </div>
  );
}
