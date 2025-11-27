'use client';

import { useSyncExternalStore, useCallback } from 'react';

/**
 * View density options:
 * - 'full': Spacious layout with all elements visible (default)
 * - 'compact': Condensed layout with smaller spacing and hidden action buttons
 * - 'list': Minimal single-row layout with only client name and deadline
 */
export type ViewDensity = 'full' | 'compact' | 'list';

const STORAGE_KEY = 'pds:view-density';

/**
 * Subscribers for the external store pattern
 * When density changes, all subscribers are notified
 */
const subscribers = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers(): void {
  subscribers.forEach(callback => callback());
}

/**
 * Get current density from DOM class
 * This is the "external store" that React syncs with
 */
function getSnapshot(): ViewDensity {
  if (document.documentElement.classList.contains('view-compact')) {
    return 'compact';
  }
  if (document.documentElement.classList.contains('view-list')) {
    return 'list';
  }
  return 'full';
}

/**
 * Server snapshot - always returns 'full' (default)
 *
 * IMPORTANT: This MUST match what the blocking script would set for a user
 * who has never set a preference. The blocking script only adds 'view-compact'
 * if localStorage has 'compact', so the default server state is 'full'.
 *
 * The CSS will be correct on first paint (blocking script handles that),
 * but the toggle UI will briefly show 'full' before React hydrates and
 * reads the actual DOM state. This is acceptable because:
 * 1. The visual layout is already correct (CSS-first)
 * 2. The toggle updates immediately after hydration (~50ms)
 * 3. No hydration mismatch errors
 */
function getServerSnapshot(): ViewDensity {
  return 'full';
}

/**
 * Update density - modifies DOM class, localStorage, and notifies React
 */
function setDensityValue(newDensity: ViewDensity): void {
  // Update localStorage (with error handling for private browsing)
  try {
    localStorage.setItem(STORAGE_KEY, newDensity);
  } catch (e) {
    console.warn('Failed to save view density preference:', e);
  }

  // Update DOM class for CSS styling
  if (newDensity === 'compact') {
    document.documentElement.classList.add('view-compact');
  } else {
    document.documentElement.classList.remove('view-compact');
  }

  // Notify React to re-render components using this hook
  notifySubscribers();
}

/**
 * useViewDensity - Manages view density state with localStorage persistence
 *
 * Uses useSyncExternalStore for proper SSR hydration:
 * - Server renders with 'full' (default)
 * - Client hydrates, then immediately syncs with actual DOM state
 * - No hydration mismatch because we use getServerSnapshot
 *
 * The blocking script in layout.tsx ensures CSS is correct before React loads.
 * This hook only manages the React state for the toggle UI.
 *
 * @returns {Object} { density, setDensity }
 */
export function useViewDensity() {
  const density = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setDensity = useCallback((newDensity: ViewDensity) => {
    setDensityValue(newDensity);
  }, []);

  return { density, setDensity };
}
