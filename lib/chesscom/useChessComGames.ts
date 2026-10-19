'use client';

import { fetchGamesPage } from './api';
import { useGamesPages, type UseGamesResult } from '@/lib/games/useGamesPages';

export function useChessComGames(username: string | null): UseGamesResult {
  return useGamesPages('chesscom-games', username, fetchGamesPage);
}
