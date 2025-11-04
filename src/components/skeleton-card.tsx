'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  showNotes?: boolean; // Control height variance to match real-world items
}

/**
 * SkeletonCard - Loading skeleton matching ItemCard layout exactly
 *
 * Features:
 * - Matches ItemCard gradient border and structure
 * - Animated pulse effect for shimmer
 * - Optional notes section for height variance
 * - Accessibility attributes (aria-busy, aria-label)
 * - Responsive layout matching ItemCard
 */
export function SkeletonCard({
  className,
  showNotes = true,
}: SkeletonCardProps) {
  return (
    <div
      className={cn('bg-gradient-card-border rounded-lg p-[2px]', className)}
      aria-busy='true'
      aria-label='Loading delivery item'>
      <Card className='bg-gradient-card border-0 h-full flex flex-col'>
        <CardHeader className='space-y-2 pb-2'>
          {/* Client Name + Status Pill Row */}
          <div className='flex items-start justify-between gap-2'>
            {/* Client name skeleton */}
            <Skeleton className='h-7 w-2/3 rounded' />
            {/* Status pill skeleton */}
            <Skeleton className='h-6 w-20 rounded-full' />
          </div>

          {/* Dates Section */}
          <div className='space-y-2'>
            {/* Shoot date */}
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded' /> {/* Calendar icon */}
              <Skeleton className='h-4 w-32 rounded' />
            </div>
            {/* Deadline row */}
            <div className='flex items-center justify-between gap-2'>
              <Skeleton className='h-4 w-40 rounded' />
              <Skeleton className='h-6 w-24 rounded-full' /> {/* Badge */}
            </div>
          </div>
        </CardHeader>

        {/* Notes Section (optional for height variety) */}
        {showNotes && (
          <CardContent className='pt-0 pb-2 flex-1'>
            <Skeleton className='h-4 w-full rounded mb-1' />
            <Skeleton className='h-4 w-5/6 rounded' />
          </CardContent>
        )}

        {/* Action Buttons */}
        <CardFooter className='pt-2 flex gap-2'>
          <Skeleton className='h-9 w-24 rounded-md' /> {/* Deliver */}
          <Skeleton className='h-9 w-24 rounded-md' /> {/* Archive */}
          <Skeleton className='h-9 w-20 rounded-md ml-auto' /> {/* Edit */}
          <Skeleton className='h-9 w-9 rounded-md' /> {/* Delete icon */}
        </CardFooter>
      </Card>
    </div>
  );
}
