'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsFormSchema, type SettingsFormData } from '@/lib/schemas/form-schemas';
import { getCommonTimezones, getTimezoneDisplayName } from '@/lib/timezone-detector';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { UserSettings } from '@/lib/db/schema';

interface SettingsFormProps {
  currentSettings: UserSettings;
  itemCount: number;
  detectedTimezone: string;
  onSubmit: (data: SettingsFormData) => Promise<void>;
  isPending: boolean;
}

export function SettingsForm({
  currentSettings,
  itemCount,
  detectedTimezone,
  onSubmit,
  isPending,
}: SettingsFormProps) {
  // Initialize form with current settings
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      default_deadline_days: currentSettings.default_deadline_days,
      timezone: currentSettings.timezone,
      applyToExisting: false,
    },
  });

  const applyToExisting = form.watch('applyToExisting');
  const commonTimezones = getCommonTimezones();

  const handleSubmit = async (data: SettingsFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Default Deadline Days */}
        <FormField
          control={form.control}
          name="default_deadline_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Deadline (days after shoot)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                Number of days after shoot date for delivery deadline (1-365)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Timezone */}
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {commonTimezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Detected: {getTimezoneDisplayName(detectedTimezone)} • Deadlines
                will be at 23:59 in this timezone
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Apply to Existing Items */}
        <FormField
          control={form.control}
          name="applyToExisting"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending || itemCount === 0}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Apply to existing items ({itemCount} item{itemCount !== 1 ? 's' : ''})
                </FormLabel>
                <FormDescription>
                  {itemCount === 0
                    ? 'No items to recalculate'
                    : 'Recalculate deadlines for all existing items with new settings'}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Warning when applyToExisting is checked */}
        {applyToExisting && itemCount > 0 && (
          <div className="rounded-md bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 p-4">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Warning:</strong> This will recalculate {itemCount} item
              {itemCount !== 1 ? 's' : ''} and reset all custom deadlines to the new
              computed deadlines.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
