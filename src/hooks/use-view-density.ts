'use client';

import { useSyncExternalStore, useCallback } from 'react';

export type ViewDensity = 'full' | 'compact' | 'list';

const STORAGE_KEY = 'pds:view-density';

const subscribers = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers(): void {
  subscribers.forEach(callback => callback());
}

function getSnapshot(): ViewDensity {
  if (document.documentElement.classList.contains('view-compact')) {
    return 'compact';
  }
  if (document.documentElement.classList.contains('view-list')) {
    return 'list';
  }
  return 'full';
}

// Server snapshot: must match the blocking script default ('full')
function getServerSnapshot(): ViewDensity {
  return 'full';
}

function setDensityValue(newDensity: ViewDensity): void {
  try {
    localStorage.setItem(STORAGE_KEY, newDensity);
  } catch (e) {
    console.warn('Failed to save view density preference:', e);
  }

  if (newDensity === 'compact') {
    document.documentElement.classList.add('view-compact');
  } else {
    document.documentElement.classList.remove('view-compact');
  }

  notifySubscribers();
}

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
