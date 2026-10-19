'use client';

import useSWR from 'swr';
import { fetchLastGames } from './api';
import { PlayerNotFoundError } from '@/lib/games/errors';
import type { Game } from '@/lib/games/types';

export type UseLichessGamesResult = {
  games: Game[] | null;
  error: Error | null;
  isLoading: boolean;
  isNotFound: boolean;
};

type FetchKey = readonly ['lichess-games', string];

const fetcher = ([, username]: FetchKey) => fetchLastGames(username, 10);

export function useLichessGames(username: string | null): UseLichessGamesResult {
  const key: FetchKey | null = username ? ['lichess-games', username] : null;

  const { data, error, isLoading } = useSWR<Game[], Error>(key, fetcher, {
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
