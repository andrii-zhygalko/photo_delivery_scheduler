'use client';

import { ItemCard } from '@/components/item-card';
import { EmptyState } from '@/components/empty-state';
import type { DeliveryItem } from '@/lib/db/schema';

interface ItemsListProps {
  items: DeliveryItem[];
  userTimezone: string;
}

export function ItemsList({ items, userTimezone }: ItemsListProps) {
  const handleEdit = (item: DeliveryItem) => {
    // TODO: Phase 6 - Open edit dialog
    console.log('Edit item:', item.id);
  };

  const handleDeliver = (item: DeliveryItem) => {
    // TODO: Phase 7 - Deliver action
    console.log('Deliver item:', item.id);
  };

  const handleArchive = (item: DeliveryItem) => {
    // TODO: Phase 7 - Archive action
    console.log('Archive item:', item.id);
  };

  if (items.length === 0) {
    return (
      <EmptyState
        message="No items found"
        description="Try adjusting your filters or create a new delivery item"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          userTimezone={userTimezone}
          onEdit={handleEdit}
          onDeliver={handleDeliver}
          onArchive={handleArchive}
        />
      ))}
    </div>
  );
}
