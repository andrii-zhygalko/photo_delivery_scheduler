'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ItemsList } from '@/components/items-list';
import { ItemDialog } from '@/components/item-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  deliverItemAction,
  archiveItemAction,
  unarchiveItemAction,
  deleteItemAction,
} from '@/actions/items';
import type {
  DeliveryItem,
  UserSettings,
  OptimisticDeliveryItem,
  OptimisticAction,
} from '@/lib/db/schema';

interface ItemsPageClientProps {
  items: DeliveryItem[];
  userSettings: UserSettings;
}

export function ItemsPageClient({ items, userSettings }: ItemsPageClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
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

  // Optimistic updates reducer
  const [optimisticItems, addOptimisticUpdate] = useOptimistic<
    OptimisticDeliveryItem[],
    OptimisticAction
  >(items, (state, action) => {
    switch (action.type) {
      case 'deliver':
        return state.map(item =>
          item.id === action.itemId
            ? {
                ...item,
                status: 'DELIVERED' as const,
                delivered_at: new Date(),
                _optimistic: true,
              }
            : item
        );
      case 'archive':
        // Mark for removal to trigger exit animation
        return state.map(item =>
          item.id === action.itemId
            ? { ...item, _removing: true, _optimistic: true }
            : item
        );
      case 'unarchive':
        // Mark for removal to trigger exit animation
        return state.map(item =>
          item.id === action.itemId
            ? { ...item, _removing: true, _optimistic: true }
            : item
        );
      case 'delete':
        // Mark for removal to trigger exit animation
        return state.map(item =>
          item.id === action.itemId
            ? { ...item, _removing: true, _optimistic: true }
            : item
        );
      case 'add':
        return [...state, { ...action.item, _optimistic: true }];
      case 'update':
        return state.map(item =>
          item.id === action.itemId
            ? { ...item, ...action.updates, _optimistic: true }
            : item
        );
      default:
        return state;
    }
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
      // Apply optimistic update inside transition
      addOptimisticUpdate({ type: 'deliver', itemId: item.id });

      const result = await deliverItemAction(item.id);
      if (result.success) {
        toast.success('Item marked as delivered!');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to mark item as delivered');
        router.refresh(); // Rollback by syncing with server state
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
        // Close dialog immediately
        setConfirmDialog(prev => ({ ...prev, open: false }));

        startTransition(async () => {
          // Apply optimistic update inside transition
          addOptimisticUpdate({ type: 'archive', itemId: item.id });

          const result = await archiveItemAction(item.id);
          if (result.success) {
            toast.success('Item archived');
            router.refresh();
          } else {
            toast.error(result.error || 'Failed to archive item');
            router.refresh(); // Rollback by syncing with server state
          }
        });
      },
    });
  };

  const handleUnarchive = async (item: DeliveryItem) => {
    startTransition(async () => {
      // Optimistic update: remove from list (won't be rendered on items page anyway)
      addOptimisticUpdate({ type: 'unarchive', itemId: item.id });

      const result = await unarchiveItemAction(item.id);
      if (!result.success) {
        toast.error(result.error || 'Failed to unarchive item');
      } else {
        toast.success('Item moved to Items page');
      }

      router.refresh();
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
        // Close dialog immediately
        setConfirmDialog(prev => ({ ...prev, open: false }));

        startTransition(async () => {
          // Apply optimistic update inside transition
          addOptimisticUpdate({ type: 'delete', itemId: item.id });

          const result = await deleteItemAction(item.id);
          if (result.success) {
            toast.success('Item deleted');
            router.refresh();
          } else {
            toast.error(result.error || 'Failed to delete item');
            router.refresh(); // Rollback by syncing with server state
          }
        });
      },
    });
  };

  return (
    <>
      {/* Page Header with animation */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 animate-fade-in-up stagger-1'>
        <div className='flex justify-between items-center w-full'>
          <div>
            <h1 className='text-2xl font-bold mb-0'>My Shoots List</h1>
            <p className='text-sm text-muted-foreground'>
              {items.length}{' '}
              {items.length === 1
                ? 'shoot to be delivered'
                : 'shoots to be delivered'}
            </p>
          </div>
          <Button onClick={handleNewItem} className='animate-fade-in-up stagger-2'>+ New Shoot</Button>
        </div>
      </div>

      {/* Items List - now handles its own animations via Framer Motion */}
      <ItemsList
        items={optimisticItems}
        userTimezone={userSettings.timezone}
        onEdit={handleEdit}
        onDeliver={handleDeliver}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
      />

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        userSettings={userSettings}
        onOptimisticUpdate={addOptimisticUpdate}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </>
  );
}
