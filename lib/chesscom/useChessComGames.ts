'use client';

import { useEffect, useState } from 'react';
import { fetchLastGames } from './api';
import { PlayerNotFoundError } from './errors';
import type { Game } from './types';

// Mirrors the shape of `useSWR(...)` — `{ data, error, isLoading }` — so the
// hook can be swapped for SWR later without touching the call sites.
export type UseChessComGamesResult = {
  games: Game[] | null;
  error: Error | null;
  isLoading: boolean;
  isNotFound: boolean;
};

type State = {
  games: Game[] | null;
  error: Error | null;
  isLoading: boolean;
};

const IDLE: State = { games: null, error: null, isLoading: false };

export function useChessComGames(
  username: string | null,
): UseChessComGamesResult {
  const [state, setState] = useState<State>(IDLE);

  useEffect(() => {
    if (!username) {
      setState(IDLE); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const controller = new AbortController();
    setState({ games: null, error: null, isLoading: true });

    fetchLastGames(username, 10, controller.signal)
      .then((games) => {
        if (controller.signal.aborted) return;
        setState({ games, error: null, isLoading: false });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        const normalized = err instanceof Error ? err : new Error(String(err));
        setState({ games: null, error: normalized, isLoading: false });
      });

    return () => controller.abort();
  }, [username]);

  return {
    ...state,
    isNotFound: state.error instanceof PlayerNotFoundError,
  };
}
