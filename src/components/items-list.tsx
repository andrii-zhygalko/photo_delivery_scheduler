'use client';

import { ItemCard } from '@/components/item-card';
import { EmptyState } from '@/components/empty-state';
import type { DeliveryItem } from '@/lib/db/schema';

interface ItemsListProps {
  items: DeliveryItem[];
  userTimezone: string;
  onEdit?: (item: DeliveryItem) => void;
  onDeliver?: (item: DeliveryItem) => void;
  onArchive?: (item: DeliveryItem) => void;
  onDelete?: (item: DeliveryItem) => void;
}

export function ItemsList({
  items,
  userTimezone,
  onEdit,
  onDeliver,
  onArchive,
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

  const handleDelete = (item: DeliveryItem) => {
    if (onDelete) {
      onDelete(item);
    } else {
      console.log('Delete item:', item.id);
    }
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
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
