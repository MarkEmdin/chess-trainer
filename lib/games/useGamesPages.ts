'use client';

import useSWRInfinite from 'swr/infinite';
import { GAMES_LIMIT } from './constants';
import { PlayerNotFoundError } from './errors';
import type { Game, GamesPage } from './types';

export type UseGamesResult = {
  // All loaded pages flattened, newest first; null before page 1 arrives.
  games: Game[] | null;
  // First-page failure only — drives the shell's full-screen error branch.
  error: Error | null;
  isLoading: boolean;
  isNotFound: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  // A page beyond the first failed; already-loaded games stay usable.
  loadMoreError: Error | null;
  // Requests the next page, or retries the failed one after loadMoreError.
  loadMore: () => void;
};

export type GamesPageFetcher = (
  username: string,
  cursor: number | null,
  limit: number,
) => Promise<GamesPage>;

type PageKey = readonly [string, string, number | null];

// Shared pagination for every games provider. Keys are
// [keyPrefix, username, cursor] so caches stay namespaced per platform and
// identical requests dedupe across /games and /think-time.
export function useGamesPages(
  keyPrefix: 'chesscom-games' | 'lichess-games',
  username: string | null,
  fetchPage: GamesPageFetcher,
): UseGamesResult {
  const getKey = (index: number, previous: GamesPage | null): PageKey | null => {
    if (!username) return null;
    if (index === 0) return [keyPrefix, username, null];
    if (!previous || previous.nextCursor === null) return null;
    return [keyPrefix, username, previous.nextCursor];
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite<
    GamesPage,
    Error
  >(getKey, ([, name, cursor]: PageKey) => fetchPage(name, cursor, GAMES_LIMIT), {
    // Past games don't change — no refetch on focus/reconnect, and loading
    // page N must not re-request page 1.
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateFirstPage: false,
  });

  const loadedPages = data?.length ?? 0;
  const firstPageError = loadedPages === 0 ? (error ?? null) : null;
  const loadMoreError = loadedPages > 0 ? (error ?? null) : null;

  let games: Game[] | null = null;
  if (data) {
    // Lichess's `until` may be inclusive; never show the same game twice.
    const seen = new Set<string>();
    games = data
      .flatMap((p) => p.games)
      .filter((g) => !seen.has(g.id) && seen.add(g.id));
  }

  return {
    games,
    error: firstPageError,
    isLoading,
    isNotFound: firstPageError instanceof PlayerNotFoundError,
    hasMore: !!data && data[loadedPages - 1]?.nextCursor != null,
    isLoadingMore: loadedPages > 0 && size > loadedPages && !error,
    loadMoreError,
    loadMore: () => {
      void setSize(loadMoreError ? size : size + 1);
    },
  };
}
