'use client';

import { fetchGamesPage } from './api';
import { useGamesPages, type UseGamesResult } from '@/lib/games/useGamesPages';

export function useLichessGames(username: string | null): UseGamesResult {
  return useGamesPages('lichess-games', username, fetchGamesPage);
}
