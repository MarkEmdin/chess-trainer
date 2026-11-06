'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'tutorial-seen';
const SAME_TAB_EVENT = 'tutorial-seen:change';

// Storage can be off (private mode). The offer must then still go away when
// closed, for as long as the page stays open.
let seenWithoutStorage = false;

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(SAME_TAB_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SAME_TAB_EVENT, onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return seenWithoutStorage || localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return seenWithoutStorage;
  }
}

// Seen on the server: a returning visitor must not get a flash of the offer.
function getServerSnapshot(): boolean {
  return true;
}

export function useTutorialSeen(): [boolean, () => void] {
  const seen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      seenWithoutStorage = true;
    }
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, []);
  return [seen, markSeen];
}
