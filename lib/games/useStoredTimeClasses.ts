'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { FILTER_TIME_CLASSES, type FilterTimeClass } from './timeClassFilter';

const STORAGE_KEY = 'games-time-classes';
const SAME_TAB_EVENT = 'games-time-classes:change';

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

// The snapshot is the raw string: a freshly parsed array on every call
// would never compare equal and send useSyncExternalStore into a loop.
function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

function parse(raw: string | null): FilterTimeClass[] {
  if (raw === null) return [...FILTER_TIME_CLASSES];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [...FILTER_TIME_CLASSES];
  }
  const selected = Array.isArray(value)
    ? FILTER_TIME_CLASSES.filter((tc) => value.includes(tc))
    : [];
  // An empty selection would show nothing at all — treat it as "everything".
  return selected.length > 0 ? selected : [...FILTER_TIME_CLASSES];
}

export function useStoredTimeClasses(): [
  FilterTimeClass[],
  (next: FilterTimeClass[]) => void,
] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const selected = useMemo(() => parse(raw), [raw]);

  const setSelected = useCallback((next: FilterTimeClass[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, []);

  return [selected, setSelected];
}
