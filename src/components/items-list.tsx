'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ItemCard } from '@/components/item-card';
import { EmptyState } from '@/components/empty-state';
import { SkeletonGrid } from '@/components/skeleton-grid';
import type { OptimisticDeliveryItem } from '@/lib/db/schema';

interface ItemsListProps {
  items: OptimisticDeliveryItem[];
  userTimezone: string;
  isLoading?: boolean; // Show skeleton grid when loading
  onEdit?: (item: OptimisticDeliveryItem) => void;
  onDeliver?: (item: OptimisticDeliveryItem) => void;
  onArchive?: (item: OptimisticDeliveryItem) => void;
  onUnarchive?: (item: OptimisticDeliveryItem) => void;
  onDelete?: (item: OptimisticDeliveryItem) => void;
}

export function ItemsList({
  items,
  userTimezone,
  isLoading = false,
  // isLoading = true,
  onEdit,
  onDeliver,
  onArchive,
  onUnarchive,
  onDelete,
}: ItemsListProps) {
  // Detect user's motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleEdit = (item: OptimisticDeliveryItem) => {
    if (onEdit) {
      onEdit(item);
    } else {
      // Fallback for when called without handler
      console.log('Edit item:', item.id);
    }
  };

  const handleDeliver = (item: OptimisticDeliveryItem) => {
    if (onDeliver) {
      onDeliver(item);
    } else {
      console.log('Deliver item:', item.id);
    }
  };

  const handleArchive = (item: OptimisticDeliveryItem) => {
    if (onArchive) {
      onArchive(item);
    } else {
      console.log('Archive item:', item.id);
    }
  };

  const handleUnarchive = (item: OptimisticDeliveryItem) => {
    if (onUnarchive) {
      onUnarchive(item);
    } else {
      console.log('Unarchive item:', item.id);
    }
  };

  const handleDelete = (item: OptimisticDeliveryItem) => {
    if (onDelete) {
      onDelete(item);
    } else {
      console.log('Delete item:', item.id);
    }
  };

  // Show skeleton while loading
  if (isLoading) {
    return <SkeletonGrid count={6} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        message='No shoots found'
        description='Try adjusting your filters or create a new delivery shoot'
      />
    );
  }

  // Filter out items marked for removal
  // AnimatePresence will automatically keep them visible during exit animation
  const visibleItems = items.filter(item => !item._removing);

  // Animation variants for staggered appearance
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.05, // 50ms stagger between items
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2 },
    },
  };

  return (
    <>
      {/* Live region for item count announcements */}
      <div
        role='status'
        aria-live='polite'
        aria-atomic='true'
        className='sr-only'>
        {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}{' '}
        found
      </div>

      {/* Semantic list structure with AnimatePresence for exit animations */}
      <motion.ul
        role='list'
        aria-label='Delivery items'
        className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 grid-auto-rows-[1fr]'
        initial='hidden'
        animate='visible'
        variants={containerVariants}>
        <AnimatePresence>
          {visibleItems.map(item => (
            <motion.li
              key={item.id}
              role='listitem'
              className='h-full'
              layout={!prefersReducedMotion}
              variants={prefersReducedMotion ? undefined : itemVariants}
              exit={
                prefersReducedMotion
                  ? undefined
                  : {
                      opacity: 0,
                      scale: 0.95,
                      height: 0,
                      marginBottom: 0,
                      overflow: 'hidden',
                    }
              }
              transition={{
                duration: 0.2,
                layout: {
                  duration: 0.2,
                },
              }}>
              <ItemCard
                item={item}
                userTimezone={userTimezone}
                onEdit={handleEdit}
                onDeliver={handleDeliver}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onDelete={handleDelete}
                className='h-full'
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </>
  );
}
