import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'TO_DO' | 'EDITING' | 'DELIVERED' | 'ARCHIVED';

interface StatusPillProps {
  status: Status;
  className?: string;
}

/**
 * StatusPill - Color-coded badge for delivery item status
 *
 * Color scheme:
 * - TO_DO: Blue (new items)
 * - EDITING: Yellow (work in progress)
 * - DELIVERED: Green (completed)
 * - ARCHIVED: Gray (archived/inactive)
 */
export function StatusPill({ status, className }: StatusPillProps) {
  const colorMap: Record<Status, string> = {
    TO_DO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    EDITING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  const labelMap: Record<Status, string> = {
    TO_DO: 'To Do',
    EDITING: 'Editing',
    DELIVERED: 'Delivered',
    ARCHIVED: 'Archived',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-0 font-medium',
        colorMap[status],
        className
      )}
    >
      {labelMap[status]}
    </Badge>
  );
}
