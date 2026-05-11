'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'chesscom-username';

export function useStoredUsername(): [
  string | null,
  (next: string | null) => void,
] {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUsername(stored); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, []);

  const setAndPersist = (next: string | null) => {
    setUsername(next);
    if (next === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
  };

  return [username, setAndPersist];
}
