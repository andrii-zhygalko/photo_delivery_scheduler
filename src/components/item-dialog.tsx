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
import type { DeliveryItem, UserSettings } from '@/lib/db/schema';
import type { ItemFormData } from '@/lib/schemas/form-schemas';
import { useRouter } from 'next/navigation';

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: DeliveryItem; // undefined = create, provided = edit
  userSettings: UserSettings;
}

export function ItemDialog({
  open,
  onOpenChange,
  item,
  userSettings,
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
      formData.append('use_custom_deadline', data.use_custom_deadline.toString());

      if (data.use_custom_deadline && data.custom_deadline) {
        formData.append('custom_deadline', data.custom_deadline);
      }

      if (isEditMode) {
        formData.append('status', data.status);
        const result = await updateItemAction(item.id, formData);

        if (result.success) {
          onOpenChange(false);
          router.refresh(); // Refresh server component data
        } else {
          setError(result.error);
        }
      } else {
        const result = await createItemAction(formData);

        if (result.success) {
          onOpenChange(false);
          router.refresh(); // Refresh server component data
        } else {
          setError(result.error);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-sm:h-[100vh] max-sm:max-w-full max-sm:rounded-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Delivery Item' : 'New Delivery Item'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the details of your delivery item.'
              : 'Create a new delivery item to track a photo shoot deadline.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
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
