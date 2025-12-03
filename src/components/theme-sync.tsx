'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

interface ThemeSyncProps {
  serverTheme: string | null | undefined;
}

/**
 * ThemeSync Component
 *
 * Synchronizes the theme preference from the database (server) to next-themes (client).
 * This runs once when a user logs in or visits the app from a new device.
 *
 * Flow:
 * 1. Server Component fetches theme_mode from database
 * 2. Passes it to ThemeSync as serverTheme prop
 * 3. ThemeSync updates next-themes if different from current
 * 4. next-themes updates localStorage and DOM class
 */
export function ThemeSync({ serverTheme }: ThemeSyncProps) {
  const { setTheme, theme } = useTheme();
  const hasSynced = useRef(false);

  useEffect(() => {
    // Only sync once per component mount
    if (hasSynced.current) {
      return;
    }

    // Skip if no server theme provided
    const targetTheme = serverTheme || 'system';

    // Only update if different from current localStorage theme
    // This prevents unnecessary re-renders and preserves user's
    // immediate changes that haven't been saved yet
    if (theme !== targetTheme) {
      setTheme(targetTheme);
    }

    hasSynced.current = true;
  }, [serverTheme, theme, setTheme]);

  // This component renders nothing to the DOM
  return null;
}
