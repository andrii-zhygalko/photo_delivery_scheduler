'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ItemsList } from '@/components/items-list';
import { ItemDialog } from '@/components/item-dialog';
import type { DeliveryItem, UserSettings } from '@/lib/db/schema';

interface ItemsPageClientProps {
  items: DeliveryItem[];
  userSettings: UserSettings;
}

export function ItemsPageClient({ items, userSettings }: ItemsPageClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeliveryItem | undefined>();

  const handleNewItem = () => {
    setSelectedItem(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (item: DeliveryItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleDeliver = async (item: DeliveryItem) => {
    // TODO: Implement in Phase 7 (Quick Actions)
    console.log('Deliver:', item.id);
  };

  const handleArchive = async (item: DeliveryItem) => {
    // TODO: Implement in Phase 7 (Quick Actions)
    console.log('Archive:', item.id);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Delivery Items</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Button onClick={handleNewItem}>+ New Item</Button>
      </div>

      <ItemsList
        items={items}
        userTimezone={userSettings.timezone}
        onEdit={handleEdit}
        onDeliver={handleDeliver}
        onArchive={handleArchive}
      />

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        userSettings={userSettings}
      />
    </>
  );
}
