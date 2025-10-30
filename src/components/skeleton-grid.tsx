'use client';

import { SkeletonCard } from '@/components/skeleton-card';

interface SkeletonGridProps {
  count?: number; // Number of skeleton cards to display
}

/**
 * SkeletonGrid - Reusable grid of skeleton cards matching ItemsList layout
 *
 * Features:
 * - Responsive grid (1 column mobile, 2 tablet, 3 desktop)
 * - Height variety (alternates showNotes prop for realism)
 * - Accessibility attributes (role="status", aria-label)
 * - Matches ItemsList grid layout exactly
 */
export function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
  // Create array of skeleton configs with varied heights
  // 2 out of 3 cards show notes section for realistic appearance
  const skeletons = Array.from({ length: count }, (_, i) => ({
    showNotes: i % 3 !== 0, // True for indices 0,1,3,4,6,7... (skips every 3rd)
  }));

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading delivery items"
    >
      {skeletons.map((config, i) => (
        <SkeletonCard key={i} showNotes={config.showNotes} />
      ))}
    </div>
  );
}
