'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ItemForm } from '@/components/item-form';
import { createItemAction, updateItemAction } from '@/actions/items';
import type {
  DeliveryItem,
  UserSettings,
  OptimisticAction,
} from '@/lib/db/schema';
import type { ItemFormData } from '@/lib/schemas/form-schemas';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: DeliveryItem; // undefined = create, provided = edit
  userSettings: UserSettings;
  onOptimisticUpdate?: (action: OptimisticAction) => void;
}

export function ItemDialog({
  open,
  onOpenChange,
  item,
  userSettings,
  onOptimisticUpdate,
}: ItemDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!item;

  const handleSubmit = async (data: ItemFormData) => {
    setError(null);

    startTransition(async () => {
      // Convert form data to FormData for Server Action
      const formData = new FormData();
      formData.append('client_name', data.client_name);
      formData.append('shoot_date', data.shoot_date);
      formData.append('notes', data.notes || '');
      formData.append(
        'use_custom_deadline',
        data.use_custom_deadline.toString()
      );

      if (data.use_custom_deadline && data.custom_deadline) {
        formData.append('custom_deadline', data.custom_deadline);
      }

      if (isEditMode) {
        formData.append('status', data.status);
        const result = await updateItemAction(item.id, formData);

        if (result.success) {
          // Apply optimistic update if callback provided
          if (onOptimisticUpdate) {
            onOptimisticUpdate({
              type: 'update',
              itemId: item.id,
              updates: {
                client_name: data.client_name,
                shoot_date: data.shoot_date,
                notes: data.notes || null,
                status: data.status,
                custom_deadline:
                  data.use_custom_deadline && data.custom_deadline
                    ? new Date(data.custom_deadline)
                    : null,
              },
            });
          }

          // Show appropriate toast based on status change
          if (item.status === 'ARCHIVED' && data.status !== 'ARCHIVED') {
            toast.success('Item unarchived and moved to active items');
          } else {
            toast.success('Item updated successfully');
          }

          // Close dialog after optimistic update applied
          onOpenChange(false);
          router.refresh(); // Sync with server
        } else {
          setError(result.error);
        }
      } else {
        const result = await createItemAction(formData);

        if (result.success) {
          // Apply optimistic update with full item from server
          if (onOptimisticUpdate) {
            onOptimisticUpdate({
              type: 'add',
              item: result.data,
            });
          }

          // Close dialog after optimistic update applied
          onOpenChange(false);
          router.refresh(); // Sync with server
        } else {
          setError(result.error);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px] max-sm:h-[100vh] max-sm:max-w-full max-sm:rounded-none overflow-y-auto !flex !flex-col gap-4'>
        <DialogHeader className='-mx-6 -mt-6 px-6 pt-6 pb-4 mb-2 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-purple-950/30 dark:via-blue-950/20 dark:to-purple-950/30 border-b border-purple-100 dark:border-purple-900/30'>
          <DialogTitle>{isEditMode ? 'Edit Shoot' : 'New Shoot'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the details of your shoot.'
              : 'Create a new shoot to track a deadline.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
            {error}
          </div>
        )}

        <ItemForm
          item={item}
          userSettings={userSettings}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
