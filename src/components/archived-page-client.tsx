'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ItemsList } from '@/components/items-list';
import { ItemDialog } from '@/components/item-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { unarchiveItemAction, deleteItemAction } from '@/actions/items';
import type {
  DeliveryItem,
  UserSettings,
  OptimisticDeliveryItem,
  OptimisticAction,
} from '@/lib/db/schema';

interface ArchivedPageClientProps {
  items: DeliveryItem[];
  userSettings: UserSettings;
}

export function ArchivedPageClient({
  items,
  userSettings,
}: ArchivedPageClientProps) {
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
      case 'delete':
        return state.filter(item => item.id !== action.itemId);
      case 'unarchive':
        // Remove from archived list
        return state.filter(item => item.id !== action.itemId);
      case 'update':
        // If is_archived is being changed to false, remove from list
        if ('is_archived' in action.updates && action.updates.is_archived === false) {
          return state.filter(item => item.id !== action.itemId);
        }
        // Otherwise, update the item
        return state.map(item =>
          item.id === action.itemId
            ? { ...item, ...action.updates, _optimistic: true }
            : item
        );
      default:
        return state;
    }
  });

  const handleEdit = (item: DeliveryItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleUnarchive = async (item: DeliveryItem) => {
    startTransition(async () => {
      // Optimistic update: remove from archived list
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
      title: 'Delete shoot?',
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
            toast.success('Shoot deleted');
            router.refresh();
          } else {
            toast.error(result.error || 'Failed to delete shoot');
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
            <h1 className='text-2xl font-bold mb-0'>Archived Shoots</h1>
            <p className='text-sm text-muted-foreground'>
              {items.length} archived {items.length === 1 ? 'shoot' : 'shoots'}
            </p>
          </div>
        </div>
      </div>

      {/* Items List with staggered animation wrapper */}
      <div className='animate-fade-in-up stagger-2'>
        <ItemsList
          items={optimisticItems}
          userTimezone={userSettings.timezone}
          onEdit={handleEdit}
          onUnarchive={handleUnarchive}
          onDelete={handleDelete}
        />
      </div>

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
