'use client';

import { useEffect, useRef, useCallback } from 'react';
import { LayoutGrid, List, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewDensity = 'full' | 'compact' | 'list';

const STORAGE_KEY = 'pds:view-density';

interface ViewToggleProps {
  className?: string;
}

export function ViewToggle({ className }: ViewToggleProps) {
  const fullButtonRef = useRef<HTMLButtonElement>(null);
  const compactButtonRef = useRef<HTMLButtonElement>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);

  // Update aria-checked after mount (to match visual state)
  // This useEffect is for accessibility, not styling
  useEffect(() => {
    function updateAria() {
      const isCompact =
        document.documentElement.classList.contains('view-compact');
      const isList = document.documentElement.classList.contains('view-list');
      const isFull = !isCompact && !isList;

      fullButtonRef.current?.setAttribute('aria-checked', String(isFull));
      compactButtonRef.current?.setAttribute('aria-checked', String(isCompact));
      listButtonRef.current?.setAttribute('aria-checked', String(isList));
    }

    updateAria();

    // Watch for class changes to keep aria in sync
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          updateAria();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const handleDensityChange = useCallback((newDensity: ViewDensity) => {
    // Update localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newDensity);
    } catch (e) {
      console.warn('Failed to save view density:', e);
    }

    // Remove all view classes first
    document.documentElement.classList.remove('view-compact', 'view-list');

    // Add appropriate class (full = no class)
    if (newDensity === 'compact') {
      document.documentElement.classList.add('view-compact');
    } else if (newDensity === 'list') {
      document.documentElement.classList.add('view-list');
    }
  }, []);

  return (
    <div
      role='radiogroup'
      aria-label='View density'
      className={cn(
        'flex items-center bg-muted/50 rounded-lg p-1 gap-0.5 border border-border/50',
        className
      )}>
      {/* Full View Button - styling controlled by CSS classes */}
      <button
        ref={fullButtonRef}
        type='button'
        role='radio'
        aria-checked='true'
        aria-label='Full view - spacious layout with all details visible'
        onClick={() => handleDensityChange('full')}
        className={cn(
          'view-toggle-btn view-toggle-full',
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium cursor-pointer',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        )}>
        <LayoutGrid className='h-4 w-4 shrink-0' aria-hidden='true' />
        <span className='hidden sm:inline'>Full</span>
      </button>

      {/* Compact View Button - styling controlled by CSS classes */}
      <button
        ref={compactButtonRef}
        type='button'
        role='radio'
        aria-checked='false'
        aria-label='Compact view - condensed layout for more items'
        onClick={() => handleDensityChange('compact')}
        className={cn(
          'view-toggle-btn view-toggle-compact',
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium cursor-pointer',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        )}>
        <Rows3 className='h-4 w-4 shrink-0' aria-hidden='true' />
        <span className='hidden sm:inline'>Compact</span>
      </button>

      {/* List View Button - styling controlled by CSS classes */}
      <button
        ref={listButtonRef}
        type='button'
        role='radio'
        aria-checked='false'
        aria-label='List view - minimal single-row layout'
        onClick={() => handleDensityChange('list')}
        className={cn(
          'view-toggle-btn view-toggle-list',
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium cursor-pointer',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        )}>
        <List className='h-4 w-4 shrink-0' aria-hidden='true' />
        <span className='hidden sm:inline'>List</span>
      </button>
    </div>
  );
}
