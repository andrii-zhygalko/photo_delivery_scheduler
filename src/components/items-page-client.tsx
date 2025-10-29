'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ItemsList } from '@/components/items-list';
import { ItemDialog } from '@/components/item-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { deliverItemAction, archiveItemAction, deleteItemAction } from '@/actions/items';
import type { DeliveryItem, UserSettings } from '@/lib/db/schema';

interface ItemsPageClientProps {
  items: DeliveryItem[];
  userSettings: UserSettings;
}

export function ItemsPageClient({ items, userSettings }: ItemsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeliveryItem | undefined>();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'default' | 'destructive';
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    confirmText: 'Continue',
    variant: 'default',
    onConfirm: () => {},
  });

  const handleNewItem = () => {
    setSelectedItem(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (item: DeliveryItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleDeliver = async (item: DeliveryItem) => {
    startTransition(async () => {
      const result = await deliverItemAction(item.id);
      if (result.success) {
        toast.success('Item marked as delivered!');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to mark item as delivered');
      }
    });
  };

  const handleArchive = async (item: DeliveryItem) => {
    setConfirmDialog({
      open: true,
      title: 'Archive Item?',
      description: `Are you sure you want to archive "${item.client_name}"? You can find it in the Archived tab.`,
      confirmText: 'Archive',
      variant: 'default',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        startTransition(async () => {
          const result = await archiveItemAction(item.id);
          if (result.success) {
            toast.success('Item archived');
            router.refresh();
          } else {
            toast.error(result.error || 'Failed to archive item');
          }
        });
      },
    });
  };

  const handleDelete = async (item: DeliveryItem) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Item?',
      description: `This will permanently delete "${item.client_name}". This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        startTransition(async () => {
          const result = await deleteItemAction(item.id);
          if (result.success) {
            toast.success('Item deleted');
            router.refresh();
          } else {
            toast.error(result.error || 'Failed to delete item');
          }
        });
      },
    });
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
        onDelete={handleDelete}
      />

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        userSettings={userSettings}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </>
  );
}
