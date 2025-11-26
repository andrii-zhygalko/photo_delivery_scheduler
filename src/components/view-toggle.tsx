'use client';

import { useEffect, useRef, useCallback } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewDensity = 'full' | 'compact';

const STORAGE_KEY = 'pds:view-density';

interface ViewToggleProps {
  className?: string;
}

/**
 * ViewToggle Fix
 *
 * PROBLEM WITH PREVIOUS VERSIONS:
 * - Used React state (`density === 'full'`) to determine button styling
 * - Server renders 'full', client might have 'compact' in localStorage
 * - React updates state after hydration → toggle flashes from Full to Compact
 *
 * SOLUTION:
 * - Button styling is 100% CSS-based (no React state)
 * - CSS selectors: `.view-toggle-full`, `.view-compact .view-toggle-full`
 * - Blocking script sets .view-compact on <html> before paint
 * - CSS immediately shows correct toggle state
 * - React only handles click events, not appearance
 *
 * HOW IT WORKS:
 * 1. Blocking script (in layout.tsx) adds .view-compact to <html> if needed
 * 2. CSS rules style buttons based on .view-compact presence
 * 3. This component just renders buttons with CSS classes
 * 4. Click handler updates: localStorage + DOM class
 * 5. CSS immediately reflects the change (no React re-render needed for styling)
 */
export function ViewToggle({ className }: ViewToggleProps) {
  const fullButtonRef = useRef<HTMLButtonElement>(null);
  const compactButtonRef = useRef<HTMLButtonElement>(null);

  // Update aria-checked after mount (to match visual state)
  // This is the ONLY useEffect - just for accessibility, not styling
  useEffect(() => {
    function updateAria() {
      const isCompact =
        document.documentElement.classList.contains('view-compact');
      fullButtonRef.current?.setAttribute('aria-checked', String(!isCompact));
      compactButtonRef.current?.setAttribute('aria-checked', String(isCompact));
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

    // Update DOM class - CSS will immediately reflect this
    if (newDensity === 'compact') {
      document.documentElement.classList.add('view-compact');
    } else {
      document.documentElement.classList.remove('view-compact');
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
        <List className='h-4 w-4 shrink-0' aria-hidden='true' />
        <span className='hidden sm:inline'>Compact</span>
      </button>
    </div>
  );
}
