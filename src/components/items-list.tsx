'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ItemCard } from '@/components/item-card';
import { EmptyState } from '@/components/empty-state';
import { SkeletonGrid } from '@/components/skeleton-grid';
import type { OptimisticDeliveryItem } from '@/lib/db/schema';

interface ItemsListProps {
  items: OptimisticDeliveryItem[];
  userTimezone: string;
  isLoading?: boolean;
  onEdit?: (item: OptimisticDeliveryItem) => void;
  onDeliver?: (item: OptimisticDeliveryItem) => void;
  onArchive?: (item: OptimisticDeliveryItem) => void;
  onUnarchive?: (item: OptimisticDeliveryItem) => void;
  onDelete?: (item: OptimisticDeliveryItem) => void;
}

/**
 * ItemsList - v6 (Final Fix)
 *
 * PROBLEM WITH PREVIOUS VERSIONS:
 * - CSS animation (.animate-card-enter) + Framer Motion (animate prop) conflicted
 * - Both tried to control opacity, causing flash on hydration
 *
 * SOLUTION:
 * - NO entrance animation at all (industry standard: Vercel, Linear, Notion)
 * - Framer Motion ONLY for exit animations (what it's actually good at)
 * - Cards just appear instantly on page load
 *
 * WHY NO ENTRANCE ANIMATION:
 * 1. SSR renders cards visible → user expects them to be there
 * 2. Adding entrance animation means: visible → invisible → animate in = FLASH
 * 3. Modern apps don't animate page load (slows perceived performance)
 * 4. Animation is for user-initiated changes (add/delete), not initial render
 */
export function ItemsList({
  items,
  userTimezone,
  isLoading = false,
  onEdit,
  onDeliver,
  onArchive,
  onUnarchive,
  onDelete,
}: ItemsListProps) {
  if (isLoading) {
    return <SkeletonGrid count={6} />;
  }

  const visibleItems = items.filter(item => !item._removing);

  if (visibleItems.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-cards-container-enter"
      role="list"
      aria-label="Delivery items"
    >
      <AnimatePresence mode="popLayout">
        {visibleItems.map((item) => (
          <motion.li
            key={item.id}
            // Layout animation for reordering/density changes
            layout
            // NO entrance animation - just appear
            initial={false}
            // Exit animation ONLY (this is what Framer Motion is for)
            exit={{
              opacity: 0,
              scale: 0.95,
              transition: { duration: 0.2 },
            }}
            transition={{
              layout: {
                type: 'spring',
                stiffness: 400,
                damping: 30,
              },
            }}
          >
            <ItemCard
              item={item}
              userTimezone={userTimezone}
              onEdit={onEdit}
              onDeliver={onDeliver}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDelete={onDelete}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
