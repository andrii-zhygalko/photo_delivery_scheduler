'use client';

import { ItemCard } from '@/components/item-card';
import { EmptyState } from '@/components/empty-state';
import { SkeletonGrid } from '@/components/skeleton-grid';
import type { DeliveryItem } from '@/lib/db/schema';

interface ItemsListProps {
  items: DeliveryItem[];
  userTimezone: string;
  isLoading?: boolean; // Show skeleton grid when loading
  onEdit?: (item: DeliveryItem) => void;
  onDeliver?: (item: DeliveryItem) => void;
  onArchive?: (item: DeliveryItem) => void;
  onUnarchive?: (item: DeliveryItem) => void;
  onDelete?: (item: DeliveryItem) => void;
}

export function ItemsList({
  items,
  userTimezone,
  isLoading = false,
  // isLoading = true,
  onEdit,
  onDeliver,
  onArchive,
  onUnarchive,
  onDelete,
}: ItemsListProps) {
  const handleEdit = (item: DeliveryItem) => {
    if (onEdit) {
      onEdit(item);
    } else {
      // Fallback for when called without handler
      console.log('Edit item:', item.id);
    }
  };

  const handleDeliver = (item: DeliveryItem) => {
    if (onDeliver) {
      onDeliver(item);
    } else {
      console.log('Deliver item:', item.id);
    }
  };

  const handleArchive = (item: DeliveryItem) => {
    if (onArchive) {
      onArchive(item);
    } else {
      console.log('Archive item:', item.id);
    }
  };

  const handleUnarchive = (item: DeliveryItem) => {
    if (onUnarchive) {
      onUnarchive(item);
    } else {
      console.log('Unarchive item:', item.id);
    }
  };

  const handleDelete = (item: DeliveryItem) => {
    if (onDelete) {
      onDelete(item);
    } else {
      console.log('Delete item:', item.id);
    }
  };

  // Show skeleton while loading
  if (isLoading) {
    return <SkeletonGrid count={6} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        message='No shoots found'
        description='Try adjusting your filters or create a new delivery shoot'
      />
    );
  }

  return (
    <>
      {/* Live region for item count announcements */}
      <div
        role='status'
        aria-live='polite'
        aria-atomic='true'
        className='sr-only'>
        {items.length} {items.length === 1 ? 'item' : 'items'} found
      </div>

      {/* Semantic list structure */}
      <ul
        role='list'
        aria-label='Delivery items'
        className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 grid-auto-rows-[1fr]'>
        {items.map(item => (
          <li key={item.id} role='listitem' className='h-full'>
            <ItemCard
              item={item}
              userTimezone={userTimezone}
              onEdit={handleEdit}
              onDeliver={handleDeliver}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
              className='h-full'
            />
          </li>
        ))}
      </ul>
    </>
  );
}
