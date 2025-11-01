import { SkeletonGrid } from '@/components/skeleton-grid';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Items Page Loading State
 *
 * Displayed automatically by Next.js while items page data is loading.
 * Shows skeleton for filter controls and grid of item cards.
 */
export default function ItemsLoading() {
  return (
    <div className='container py-4 px-4'>
      {/* Skeleton for ItemsFilter component */}
      <div className='mb-6 space-y-4'>
        {/* Status filter buttons skeleton */}
        <div className='flex gap-2 flex-wrap'>
          <Skeleton className='h-10 w-20 rounded-md' /> {/* All */}
          <Skeleton className='h-10 w-24 rounded-md' /> {/* To Do */}
          <Skeleton className='h-10 w-24 rounded-md' /> {/* Editing */}
          <Skeleton className='h-10 w-28 rounded-md' /> {/* Delivered */}
        </div>

        {/* Sort dropdown skeleton */}
        <div className='flex items-center gap-2'>
          <Skeleton className='h-5 w-16 rounded' /> {/* "Sort by:" label */}
          <Skeleton className='h-10 w-full sm:w-64 rounded-md' />
        </div>
      </div>

      {/* Skeleton grid matching ItemsList */}
      <SkeletonGrid count={6} />
    </div>
  );
}
