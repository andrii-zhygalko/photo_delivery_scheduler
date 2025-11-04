import { Skeleton } from '@/components/ui/skeleton';

/**
 * FilterSkeleton - Loading skeleton for ItemsFilter component
 *
 * Matches exact dimensions of Select components to prevent layout shift during hydration.
 * Used as Suspense fallback while searchParams are being resolved.
 */
export function FilterSkeleton() {
  return (
    <div className='flex justify-between md:justify-start flex-wrap gap-3 mb-3'>
      {/* Status filter skeleton - matches Select min-width */}
      <Skeleton className='h-10 w-[180px] rounded-md' />

      {/* Sort filter skeleton - matches Select min-width */}
      <Skeleton className='h-10 w-[180px] rounded-md' />

      {/* Order toggle button skeleton */}
      <Skeleton className='h-10 w-10 rounded-md shrink-0' />
    </div>
  );
}
