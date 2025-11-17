import { Badge } from '@/components/ui/badge';
import { daysRemaining } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface DeadlineBadgeProps {
  computedDeadline: Date | string; // UTC timestamptz
  customDeadline?: Date | string | null; // UTC timestamptz (optional)
  userTimezone: string; // IANA timezone name
  className?: string;
}

/**
 * DeadlineBadge - Shows days remaining until deadline with urgency-based colors
 *
 * Color scheme:
 * - Overdue (< 0 days): Destructive red
 * - Due soon (1-3 days): Orange warning
 * - Normal (4+ days): Default gray
 *
 * Shows lightning bolt (⚡) when custom deadline is earlier than computed deadline
 */
export function DeadlineBadge({
  computedDeadline,
  customDeadline,
  userTimezone,
  className,
}: DeadlineBadgeProps) {

  // Use custom deadline if set, otherwise use computed
  const effectiveDeadline = customDeadline || computedDeadline;
  const days = daysRemaining(effectiveDeadline, userTimezone);

  // Check if custom deadline is earlier (user pushed deadline forward)
  const isCustomEarlier =
    customDeadline &&
    (customDeadline instanceof Date
      ? customDeadline
      : new Date(customDeadline)
    ).getTime() <
      (computedDeadline instanceof Date
        ? computedDeadline
        : new Date(computedDeadline)
      ).getTime();

  // Determine variant and styling based on days remaining
  let variant: 'destructive' | 'default' = 'default';
  let customClasses = '';

  if (days < 0) {
    // Overdue
    variant = 'destructive';
  } else if (days >= 1 && days <= 3) {
    // Due soon (1-3 days) - orange warning
    customClasses =
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
  }

  // Format the badge text
  const badgeText =
    days < 0
      ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
      : `${days} day${days === 1 ? '' : 's'} remaining`;

  // Generate accessible label with urgency level and context
  const urgencyLevel =
    days < 0
      ? 'Overdue - urgent'
      : days >= 1 && days <= 3
      ? 'Due soon - high priority'
      : 'Upcoming';

  const accessibleLabel = `${urgencyLevel}: ${badgeText}${
    isCustomEarlier ? ', custom deadline' : ''
  }`;

  return (
    <Badge
      variant={variant}
      className={cn('font-medium', customClasses, className)}
      aria-label={accessibleLabel}>
      {badgeText}
      {isCustomEarlier && <span aria-hidden='true'> ⚡</span>}
    </Badge>
  );
}
