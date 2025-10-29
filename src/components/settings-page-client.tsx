'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SettingsForm } from './settings-form';
import { ConfirmDialog } from './confirm-dialog';
import { detectUserTimezone } from '@/lib/timezone-detector';
import type { UserSettings } from '@/lib/db/schema';
import type { SettingsFormData } from '@/lib/schemas/form-schemas';
import { updateSettingsAction } from '@/actions/settings';

interface SettingsPageClientProps {
  currentSettings: UserSettings;
  itemCount: number;
}

export function SettingsPageClient({
  currentSettings,
  itemCount,
}: SettingsPageClientProps) {
  const [detectedTimezone, setDetectedTimezone] = useState<string>('UTC');

  // Detect timezone on client side (uses browser APIs)
  useEffect(() => {
    setDetectedTimezone(detectUserTimezone());
  }, []);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingData, setPendingData] = useState<SettingsFormData | null>(null);

  const handleSubmit = async (data: SettingsFormData) => {
    // If applyToExisting is true and there are items, show confirmation
    if (data.applyToExisting && itemCount > 0) {
      setPendingData(data);
      setShowConfirmDialog(true);
      return;
    }

    // Otherwise submit directly
    await submitSettings(data);
  };

  const submitSettings = async (data: SettingsFormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('default_deadline_days', data.default_deadline_days.toString());
        formData.append('timezone', data.timezone);
        formData.append('applyToExisting', data.applyToExisting.toString());

        const result = await updateSettingsAction(formData);

        if (result.success) {
          toast.success('Settings updated successfully');
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to update settings');
        }
      } catch (error) {
        console.error('Settings update error:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  const handleConfirm = async () => {
    if (pendingData) {
      await submitSettings(pendingData);
      setPendingData(null);
    }
    setShowConfirmDialog(false);
  };

  const handleOpenChange = (open: boolean) => {
    setShowConfirmDialog(open);
    if (!open) {
      // Dialog was closed without confirming - clear pending data
      setPendingData(null);
    }
  };

  return (
    <>
      <SettingsForm
        currentSettings={currentSettings}
        itemCount={itemCount}
        detectedTimezone={detectedTimezone}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        title="Recalculate All Items?"
        description={`This will recalculate ${itemCount} item${
          itemCount !== 1 ? 's' : ''
        } and reset all custom deadlines to the new computed deadlines. This action cannot be undone.`}
        confirmText="Recalculate"
        confirmVariant="default"
      />
    </>
  );
}
