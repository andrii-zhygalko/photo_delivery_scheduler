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

// Status configuration with labels and descriptions for accessibility
const statusConfig: Record<
  Status,
  { label: string; description: string; colors: string }
> = {
  TO_DO: {
    label: 'To Do',
    description: 'Not started',
    colors: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  EDITING: {
    label: 'Editing',
    description: 'Work in progress',
    colors: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  DELIVERED: {
    label: 'Delivered',
    description: 'Completed',
    colors: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  ARCHIVED: {
    label: 'Archived',
    description: 'No longer active',
    colors: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn('border-0 font-medium', config.colors, className)}
      aria-label={`Status: ${config.label} - ${config.description}`}
    >
      {config.label}
    </Badge>
  );
}
