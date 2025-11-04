import { SkeletonGrid } from '@/components/skeleton-grid';
import { FilterSkeleton } from '@/components/filter-skeleton';
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
      {/* Filter skeleton matching ItemsFilter exact dimensions */}
      <FilterSkeleton />

      {/* Header section skeleton matching ItemsPageClient */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'>
        <div className='flex justify-between items-center w-full'>
          <div className='space-y-2'>
            {/* Heading skeleton */}
            <Skeleton className='h-8 w-48 rounded' />
            {/* Paragraph skeleton */}
            <Skeleton className='h-5 w-40 rounded' />
          </div>
          {/* Button skeleton */}
          <Skeleton className='h-10 w-32 rounded-md' />
        </div>
      </div>

      {/* Skeleton grid matching ItemsList */}
      <SkeletonGrid count={6} />
    </div>
  );
}
