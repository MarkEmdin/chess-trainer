'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'chesscom-think-threshold';
const SAME_TAB_EVENT = 'chesscom-think-threshold:change';

const DEFAULT_THRESHOLD = 45;

function subscribe(onChange: () => void): () => void {
  const handler = (e: Event) => {
    if (e instanceof StorageEvent && e.key !== null && e.key !== STORAGE_KEY) {
      return;
    }
    onChange();
  };
  window.addEventListener('storage', handler);
  window.addEventListener(SAME_TAB_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(SAME_TAB_EVENT, handler);
  };
}

function getSnapshot(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_THRESHOLD;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_THRESHOLD;
}

function getServerSnapshot(): number {
  return DEFAULT_THRESHOLD;
}

export function useStoredThreshold(): [number, (next: number) => void] {
  const threshold = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setThreshold = useCallback((next: number) => {
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, []);

  return [threshold, setThreshold];
}
