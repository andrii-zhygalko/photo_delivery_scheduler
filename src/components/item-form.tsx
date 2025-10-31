'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemFormSchema, type ItemFormData } from '@/lib/schemas/form-schemas';
import { computeDeadline, formatDeadline } from '@/lib/date-utils';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { DeliveryItem, UserSettings } from '@/lib/db/schema';

interface ItemFormProps {
  item?: DeliveryItem; // undefined = create mode, provided = edit mode
  userSettings: UserSettings;
  onSubmit: (data: ItemFormData) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

export function ItemForm({
  item,
  userSettings,
  onSubmit,
  onCancel,
  isPending,
}: ItemFormProps) {
  const isEditMode = !!item;

  // Convert Date/string to YYYY-MM-DD format for input type="date"
  const formatDateForInput = (
    date: Date | string | null | undefined
  ): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  // Initialize form with default values
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      client_name: item?.client_name ?? '',
      shoot_date: formatDateForInput(item?.shoot_date) ?? '',
      notes: item?.notes ?? '',
      status: item?.status ?? 'TO_DO',
      use_custom_deadline: !!item?.custom_deadline,
      custom_deadline: item?.custom_deadline
        ? formatDateForInput(item.custom_deadline)
        : '',
    },
  });

  const [showCustomDeadline, setShowCustomDeadline] = useState(
    !!item?.custom_deadline
  );
  const shootDate = form.watch('shoot_date');

  // Calculate computed deadline preview
  const [computedDeadlinePreview, setComputedDeadlinePreview] =
    useState<string>('');

  useEffect(() => {
    if (shootDate) {
      try {
        const deadline = computeDeadline(
          shootDate,
          userSettings.default_deadline_days,
          userSettings.timezone
        );
        const formatted = formatDeadline(deadline, userSettings.timezone);
        setComputedDeadlinePreview(formatted);
      } catch (error) {
        console.error('Error computing deadline preview:', error);
        setComputedDeadlinePreview('');
      }
    } else {
      setComputedDeadlinePreview('');
    }
  }, [shootDate, userSettings]);

  const handleSubmit = async (data: ItemFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
        {/* Client Name */}
        <FormField
          control={form.control}
          name='client_name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder='John & Jane Doe'
                  {...field}
                  disabled={isPending}
                  autoFocus
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Shoot Date */}
        <FormField
          control={form.control}
          name='shoot_date'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shoot Date *</FormLabel>
              <FormControl>
                <Input type='date' {...field} disabled={isPending} />
              </FormControl>
              {computedDeadlinePreview && (
                <FormDescription>
                  Computed deadline: {computedDeadlinePreview}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status (edit mode only) */}
        {isEditMode && (
          <FormField
            control={form.control}
            name='status'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isPending}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='TO_DO'>To Do</SelectItem>
                    <SelectItem value='EDITING'>Editing</SelectItem>
                    <SelectItem value='DELIVERED'>Delivered</SelectItem>
                    <SelectItem value='ARCHIVED'>Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Custom Deadline Toggle */}
        <div className='space-y-4'>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='custom-deadline-toggle'
              checked={showCustomDeadline}
              onCheckedChange={checked => {
                setShowCustomDeadline(!!checked);
                form.setValue('use_custom_deadline', !!checked);
                if (!checked) {
                  form.setValue('custom_deadline', '');
                }
              }}
              disabled={isPending}
            />
            <label
              htmlFor='custom-deadline-toggle'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
              Set custom deadline
            </label>
          </div>

          {/* Custom Deadline Date Input */}
          {showCustomDeadline && (
            <FormField
              control={form.control}
              name='custom_deadline'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Deadline</FormLabel>
                  <FormControl>
                    <Input
                      type='date'
                      {...field}
                      disabled={isPending}
                      min={shootDate || undefined}
                    />
                  </FormControl>
                  <FormDescription>
                    Must be on or after shoot date and before computed deadline
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name='notes'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Add any notes about this shoot...'
                  className='min-h-[100px]'
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className='flex gap-3 justify-end pt-4'>
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isPending}>
            Cancel
          </Button>
          <Button type='submit' disabled={isPending}>
            {isPending
              ? isEditMode
                ? 'Saving...'
                : 'Creating...'
              : isEditMode
              ? 'Save Changes'
              : 'Create Shoot'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
