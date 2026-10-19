'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'lichess-username';

// The native `storage` event only fires in *other* tabs after a localStorage
// write. We dispatch a custom event so subscribers in the same tab also
// re-read on every setter call — keeps multiple hook instances in sync.
const SAME_TAB_EVENT = 'lichess-username:change';

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

function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): null {
  return null;
}

export function useStoredLichessUsername(): [
  string | null,
  (next: string | null) => void,
] {
  const username = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setUsername = useCallback((next: string | null) => {
    if (next === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, []);

  return [username, setUsername];
}
