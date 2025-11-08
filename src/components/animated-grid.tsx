'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedGridProps {
  children: React.ReactNode;
  className?: string;
  maxStagger?: number; // maximum number of stagger classes to use
}

/**
 * AnimatedGrid - A grid container that animates its children with staggered fade-in
 *
 * Features:
 * - Staggered fade-in animation for grid items
 * - Only animates on mount (not on re-renders)
 * - Respects prefers-reduced-motion
 * - Performant with CSS animations
 *
 * @param children - Grid items to animate (typically ItemCard components)
 * @param className - Additional CSS classes for the grid container
 * @param maxStagger - Maximum stagger index (default: 12, for up to 600ms total)
 */
export function AnimatedGrid({
  children,
  className = '',
  maxStagger = 12,
}: AnimatedGridProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only animate once on mount
    if (hasAnimated) return;

    const timer = setTimeout(() => {
      setHasAnimated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [hasAnimated]);

  // Convert children to array and add animation classes
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div ref={gridRef} className={className}>
      {childArray.map((child, index) => {
        if (!child) return null;

        // Calculate stagger class (cycle through stagger-1 to stagger-12)
        const staggerIndex = Math.min(index + 1, maxStagger);
        const staggerClass = `stagger-${staggerIndex}`;

        return (
          <div
            key={index}
            className={`animate-fade-in-up ${!hasAnimated ? staggerClass : ''}`}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
