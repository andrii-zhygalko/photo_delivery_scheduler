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
import { formatDeadline } from '@/lib/date-utils';
import type { OptimisticDeliveryItem } from '@/lib/db/schema';
import {
  Camera,
  CalendarIcon,
  Edit2Icon,
  CheckCircle2Icon,
  ArchiveIcon,
  Trash2Icon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: OptimisticDeliveryItem;
  userTimezone: string; // IANA timezone name
  onEdit?: (item: OptimisticDeliveryItem) => void;
  onDeliver?: (item: OptimisticDeliveryItem) => void;
  onArchive?: (item: OptimisticDeliveryItem) => void;
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
 */
export function ItemCard({
  item,
  userTimezone,
  onEdit,
  onDeliver,
  onArchive,
  onDelete,
  className,
}: ItemCardProps) {
  const formattedShootDate = formatDeadline(item.shoot_date, userTimezone);
  const formattedDeadline = formatDeadline(
    item.custom_deadline || item.computed_deadline,
    userTimezone
  );

  const itemId = `item-${item.id}`;
  const titleId = `${itemId}-title`;

  // Add visual feedback for optimistic updates
  const isOptimistic = item._optimistic;

  return (
    <div
      className={cn(
        'bg-gradient-card-border rounded-lg p-[2px]',
        'hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-200',
        isOptimistic && 'opacity-70', // Reduced opacity during pending state
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
        <CardHeader className='space-y-2 pb-3'>
          {/* Client Name */}
          <div className='flex items-start justify-between gap-2'>
            <h3
              id={titleId}
              className='text-lg font-semibold text-slate-900 dark:text-slate-100 truncate flex-1'>
              {item.client_name}
            </h3>
            <StatusPill status={item.status} />
          </div>

          {/* Dates Section */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400'>
              <Camera className='h-4 w-4' aria-hidden='true' />
              <span>
                {/* <span className='sr-only'>Shoot date: </span> */}
                <span className='text-sm text-slate-600 dark:text-slate-400'>
                  Shoot date:
                </span>
                <time dateTime={item.shoot_date}> {formattedShootDate}</time>
              </span>
            </div>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex gap-2 items-center'>
                <CalendarIcon
                  className='h-4 w-4 justify-self-start'
                  aria-hidden='true'
                />
                <span className='text-sm text-slate-600 dark:text-slate-400'>
                  Deadline: {formattedDeadline}
                </span>
              </div>
              <DeadlineBadge
                computedDeadline={item.computed_deadline}
                customDeadline={item.custom_deadline}
                userTimezone={userTimezone}
              />
            </div>
          </div>
        </CardHeader>

        {/* Notes Section */}
        {item.notes && (
          <CardContent className='pt-0 pb-3 flex-1'>
            <div className='text-sm text-slate-600 dark:text-slate-400 line-clamp-2'>
              {item.notes}
            </div>
          </CardContent>
        )}

        {/* Action Buttons */}
        <CardFooter className='pt-3 flex gap-2'>
          {item.status !== 'DELIVERED' &&
            item.status !== 'ARCHIVED' &&
            onDeliver && (
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

          {item.status !== 'ARCHIVED' && onArchive && (
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
