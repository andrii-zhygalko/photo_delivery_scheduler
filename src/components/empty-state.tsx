import { Button } from '@/components/ui/button';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  message = 'No items yet',
  description = 'Get started by creating your first delivery item',
  actionLabel = '+ New Item',
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-4" aria-hidden="true">
        <PackageOpen className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{message}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      {onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
