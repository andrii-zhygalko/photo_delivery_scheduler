'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ItemsList } from '@/components/items-list';
import { ItemDialog } from '@/components/item-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { deleteItemAction } from '@/actions/items';
import type { DeliveryItem, UserSettings } from '@/lib/db/schema';

interface ArchivedPageClientProps {
  items: DeliveryItem[];
  userSettings: UserSettings;
}

export function ArchivedPageClient({
  items,
  userSettings,
}: ArchivedPageClientProps) {
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

  const handleEdit = (item: DeliveryItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Archived Items</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} archived {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <ItemsList
        items={items}
        userTimezone={userSettings.timezone}
        onEdit={handleEdit}
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
