'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/status-pill';
import { DeadlineBadge } from '@/components/deadline-badge';
import { formatDeadline, formatShortDate } from '@/lib/date-utils';
import type { DeliveryItem } from '@/lib/db/schema';
import { CalendarIcon, Edit2Icon, CheckCircle2Icon, ArchiveIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: DeliveryItem;
  userTimezone: string; // IANA timezone name
  onEdit?: (item: DeliveryItem) => void;
  onDeliver?: (item: DeliveryItem) => void;
  onArchive?: (item: DeliveryItem) => void;
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
  className,
}: ItemCardProps) {
  const formattedShootDate = formatShortDate(item.shoot_date, userTimezone);
  const formattedDeadline = formatDeadline(
    item.custom_deadline || item.computed_deadline,
    userTimezone
  );

  return (
    <div
      className={cn(
        'bg-gradient-card-border rounded-lg p-[2px]',
        'hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-200',
        className
      )}
    >
      <Card className="bg-gradient-card border-0 h-full flex flex-col">
        <CardHeader className="space-y-3 pb-3">
          {/* Client Name */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
              {item.client_name}
            </h3>
            <StatusPill status={item.status} />
          </div>

          {/* Dates Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <CalendarIcon className="h-4 w-4" />
              <span>Shoot: {formattedShootDate}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Deadline: {formattedDeadline}
              </span>
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
          <CardContent className="pt-0 pb-3 flex-1">
            <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {item.notes}
            </div>
          </CardContent>
        )}

        {/* Action Buttons */}
        <CardFooter className="pt-3 flex gap-2 flex-wrap">
          {item.status !== 'DELIVERED' && item.status !== 'ARCHIVED' && onDeliver && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onDeliver(item)}
              className="flex items-center gap-1"
            >
              <CheckCircle2Icon className="h-4 w-4" />
              Deliver
            </Button>
          )}

          {item.status !== 'ARCHIVED' && onArchive && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onArchive(item)}
              className="flex items-center gap-1"
            >
              <ArchiveIcon className="h-4 w-4" />
              Archive
            </Button>
          )}

          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(item)}
              className="flex items-center gap-1 ml-auto"
            >
              <Edit2Icon className="h-4 w-4" />
              Edit
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
