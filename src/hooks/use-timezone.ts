'use client';

import { useEffect, useState } from 'react';
import { detectUserTimezone } from '@/lib/timezone-detector';

/**
 * Hook to detect and provide user's timezone.
 * Can be used on first app load to update user settings if timezone is 'UTC'.
 */
export function useTimezone() {
  const [timezone, setTimezone] = useState<string>('UTC');
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detected = detectUserTimezone();
    setTimezone(detected);
    setIsDetecting(false);
  }, []);

  return { timezone, isDetecting };
}
