import { SkeletonGrid } from '@/components/skeleton-grid';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Archived Page Loading State
 *
 * Displayed automatically by Next.js while archived page data is loading.
 * Shows skeleton for page header and grid of archived item cards.
 */
export default function ArchivedLoading() {
  return (
    <div className='container py-4 px-4'>
      {/* Header skeleton */}
      <div className='mb-6 space-y-2'>
        <Skeleton className='h-9 w-48 rounded-md' />{' '}
        {/* "Archived Items" heading */}
        <Skeleton className='h-5 w-80 max-w-full rounded' />{' '}
        {/* Description text */}
      </div>

      {/* Skeleton grid matching ItemsList */}
      <SkeletonGrid count={6} />
    </div>
  );
}
