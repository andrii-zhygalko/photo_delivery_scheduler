'use client';

import React, { memo } from 'react';

interface AuroraTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
}

/**
 * AuroraText - Animated gradient text component
 *
 * Features:
 * - Animated gradient background with smooth color transitions
 * - Customizable colors and animation speed
 * - SEO-friendly with screen reader accessible text
 * - Respects user's motion preferences (prefers-reduced-motion)
 *
 * @example
 * <AuroraText colors={['#FF0080', '#7928CA', '#0070F3']}>
 *   Beautiful Text
 * </AuroraText>
 */
export const AuroraText = memo(
  ({
    children,
    className = '',
    colors = ['#FF0080', '#7928CA', '#0070F3', '#38bdf8'],
    speed = 1,
  }: AuroraTextProps) => {
    const gradientStyle = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(', ')}, ${colors[0]})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animationDuration: `${10 / speed}s`,
    };

    return (
      <span className={`relative inline-block ${className}`}>
        {/* Screen reader accessible text (hidden visually) */}
        <span className="sr-only">{children}</span>

        {/* Animated gradient text (visual only) */}
        <span
          className="animate-aurora relative bg-[length:200%_auto] bg-clip-text text-transparent"
          style={gradientStyle}
          aria-hidden="true"
        >
          {children}
        </span>
      </span>
    );
  }
);

AuroraText.displayName = 'AuroraText';
