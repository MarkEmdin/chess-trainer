'use client';

import useSWR from 'swr';
import { fetchLastGames } from './api';
import { PlayerNotFoundError } from './errors';
import type { Game } from './types';

export type UseChessComGamesResult = {
  games: Game[] | null;
  error: Error | null;
  isLoading: boolean;
  isNotFound: boolean;
};

type FetchKey = readonly ['chesscom-games', string];

const fetcher = ([, username]: FetchKey) => fetchLastGames(username, 10);

export function useChessComGames(
  username: string | null,
): UseChessComGamesResult {
  const key: FetchKey | null = username ? ['chesscom-games', username] : null;

  const { data, error, isLoading } = useSWR<Game[], Error>(key, fetcher, {
    // Past games don't change — no point in hitting the API on every window
    // focus or reconnect. SWR still revalidates on stale data when the hook
    // remounts, which doubles as a free retry path for transient errors.
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    games: data ?? null,
    error: error ?? null,
    isLoading,
    isNotFound: error instanceof PlayerNotFoundError,
  };
}
