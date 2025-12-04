'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/status-pill';
import { DeadlineBadge } from '@/components/deadline-badge';
import { formatDeadline, formatDeadlineFull } from '@/lib/date-utils';
import type { OptimisticDeliveryItem } from '@/lib/db/schema';
import {
  Camera,
  CalendarIcon,
  Edit2Icon,
  CheckCircle2Icon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  Trash2Icon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: OptimisticDeliveryItem;
  userTimezone: string; // IANA timezone name
  onEdit?: (item: OptimisticDeliveryItem) => void;
  onDeliver?: (item: OptimisticDeliveryItem) => void;
  onArchive?: (item: OptimisticDeliveryItem) => void;
  onUnarchive?: (item: OptimisticDeliveryItem) => void;
  onDelete?: (item: OptimisticDeliveryItem) => void;
  className?: string;
}

/**
 * ItemCard - Displays a delivery item with gradient border and hover effects
 *
 * Features:
 * - Purple/blue gradient border (p-[2px] wrapper technique)
 * - Gradient background (white to slate in light mode)
 * - Hover effect with purple shadow glow
 * - Sections: client name, dates, deadline, status, notes, actions
 * - Mobile-optimized spacing and touch targets
 *
 * VIEW DENSITY:
 * - Uses CSS utility classes (.view-density-*) for styling
 * - Styling controlled by .view-compact class on <html>
 * - NO JavaScript conditional rendering for density
 * - 'group' class enables hover effects for compact mode footer
 */
export function ItemCard({
  item,
  userTimezone,
  onEdit,
  onDeliver,
  onArchive,
  onUnarchive,
  onDelete,
  className,
}: ItemCardProps) {
  const formattedShootDate = formatDeadline(item.shoot_date, userTimezone);
  const effectiveDeadline = item.custom_deadline || item.computed_deadline;
  const formattedDeadline = formatDeadline(effectiveDeadline, userTimezone);
  const formattedDeadlineFull = formatDeadlineFull(
    effectiveDeadline,
    userTimezone
  );

  const itemId = `item-${item.id}`;
  const titleId = `${itemId}-title`;

  // Add visual feedback for optimistic updates
  const isOptimistic = item._optimistic;

  return (
    <div
      data-status={item.status}
      className={cn(
        // Base styles
        'bg-gradient-card-border rounded-lg',
        // Full height to match tallest card in grid row
        // 'h-full',
        // View density wrapper (controlled by CSS)
        'view-density-wrapper',
        // Hover effects
        'hover:shadow-lg hover:shadow-purple-500/20 transition-shadow duration-200',
        // 'group' class enables .group:hover selectors for compact mode
        'group',
        // Optimistic update feedback
        isOptimistic && 'opacity-70',
        className
      )}>
      <Card
        className={cn(
          'bg-gradient-card border-0 h-full flex flex-col',
          isOptimistic && 'pointer-events-none' // Prevent interactions during pending state
        )}
        role='article'
        aria-labelledby={titleId}
        aria-busy={isOptimistic}>
        {/* Header: Client name + Status + Dates */}
        <CardHeader className='view-density-header'>
          {/* Client Name */}
          <div className='mt-2 flex items-start justify-between gap-2'>
            <h3
              id={titleId}
              className='view-density-title font-semibold text-slate-900 dark:text-slate-100 truncate flex-1'>
              {item.client_name}
            </h3>
            {/* Status Pill - hidden in list view */}
            <div className='view-density-status'>
              <StatusPill status={item.status} />
            </div>
          </div>

          {/* Dates Section */}
          <div className='view-density-dates'>
            {/* Shoot Date - hidden in list view */}
            <div className='view-density-shoot-date flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400'>
              <Camera className='h-4 w-4 shrink-0' aria-hidden='true' />
              <span>
                <span className='text-sm text-slate-600 dark:text-slate-400'>
                  Shoot date:
                </span>
                <time dateTime={item.shoot_date}> {formattedShootDate}</time>
              </span>
            </div>

            {/* Deadline */}
            <div className='view-density-deadline flex items-center gap-1.5 text-sm'>
              <CalendarIcon
                className='h-4 w-4 text-slate-600 dark:text-slate-400'
                aria-hidden='true'
              />

              {/* Standard label - hidden in list view */}
              <span className='view-density-deadline-label text-slate-600 dark:text-slate-400'>
                Deadline:
              </span>

              {/* List view label - hidden by default, shown in list view */}
              <span className='view-density-deadline-ship-label text-slate-600 dark:text-slate-400'>
                Ship till:
              </span>

              {/* Standard date format - hidden in list view */}
              <time
                className='view-density-deadline-date-standard text-slate-600 dark:text-slate-400'
                dateTime={
                  effectiveDeadline instanceof Date
                    ? effectiveDeadline.toISOString()
                    : effectiveDeadline
                }>
                {formattedDeadline}
              </time>

              {/* Full date format - hidden by default, shown in list view */}
              <time
                className='view-density-deadline-date-full font-medium text-slate-900 dark:text-slate-100'
                dateTime={
                  effectiveDeadline instanceof Date
                    ? effectiveDeadline.toISOString()
                    : effectiveDeadline
                }>
                {formattedDeadlineFull}
              </time>

              {/* Deadline badge - hidden in list view */}
              {!item.is_archived && item.status !== 'DELIVERED' && (
                <div className='view-density-deadline-badge'>
                  <DeadlineBadge
                    computedDeadline={item.computed_deadline}
                    customDeadline={item.custom_deadline}
                    userTimezone={userTimezone}
                  />
                </div>
              )}
            </div>

            {/* Delivered Date (shown for delivered items) */}
            {item.status === 'DELIVERED' && item.delivered_at && (
              <div className='flex items-center gap-2 text-sm text-green-700 dark:text-green-400'>
                <CheckCircle2Icon
                  className='h-4 w-4 shrink-0'
                  aria-hidden='true'
                />
                <span>
                  Delivered on{' '}
                  <time
                    dateTime={
                      typeof item.delivered_at === 'string'
                        ? item.delivered_at
                        : item.delivered_at.toISOString()
                    }>
                    {formatDeadline(item.delivered_at, userTimezone)}
                  </time>
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Notes Section */}
        {item.notes && (
          <CardContent className='view-density-content pt-0 flex-1'>
            <div className='view-density-notes text-sm text-slate-600 dark:text-slate-400'>
              {item.notes}
            </div>
          </CardContent>
        )}

        {/* Action Buttons */}
        <CardFooter className='view-density-footer gap-2'>
          {/* Deliver button - only for non-archived, non-delivered items */}
          {!item.is_archived && item.status !== 'DELIVERED' && onDeliver && (
            <Button
              size='sm'
              variant='default'
              onClick={() => onDeliver(item)}
              className='flex items-center gap-1'
              aria-label={`Mark ${item.client_name} as delivered`}>
              <CheckCircle2Icon className='h-4 w-4' aria-hidden='true' />
              Deliver
            </Button>
          )}

          {/* Archive button - only for non-archived items */}
          {!item.is_archived && onArchive && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => onArchive(item)}
              className='flex items-center gap-1'
              aria-label={`Archive ${item.client_name}`}>
              <ArchiveIcon className='h-4 w-4' aria-hidden='true' />
              Archive
            </Button>
          )}

          {/* Unarchive button - only for archived items */}
          {item.is_archived && onUnarchive && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => onUnarchive(item)}
              className='flex items-center gap-1'
              aria-label={`Unarchive ${item.client_name}`}>
              <ArchiveRestoreIcon className='h-4 w-4' aria-hidden='true' />
              Unarchive
            </Button>
          )}

          {/* Edit button */}
          {onEdit && (
            <Button
              size='sm'
              variant='ghost'
              onClick={() => onEdit(item)}
              className='flex items-center gap-1 ml-auto'
              aria-label={`Edit delivery item for ${item.client_name}`}>
              <Edit2Icon className='h-4 w-4' aria-hidden='true' />
              Edit
            </Button>
          )}

          {/* Delete button */}
          {onDelete && (
            <Button
              size='sm'
              variant='ghost'
              onClick={() => onDelete(item)}
              className='flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10'
              aria-label={`Delete ${item.client_name}`}>
              <Trash2Icon className='h-4 w-4' aria-hidden='true' />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
