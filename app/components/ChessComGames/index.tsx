'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { Game } from '@/lib/games/types';
import GamesShell from '@/app/components/GamesShell';
import GamesList from './GamesList';

// GameModal pulls in chess.js + react-chessboard (~heavy). Defer until the
// user actually clicks a tile — the landing experience on /games doesn't
// need the chess engine in the initial bundle.
const GameModal = dynamic(() => import('./GameModal'), { ssr: false });

type Props = {
  isAuthenticated: boolean;
  initialChesscomUsername: string | null;
  initialLichessUsername: string | null;
};

export default function ChessComGames({
  isAuthenticated,
  initialChesscomUsername,
  initialLichessUsername,
}: Props) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const t = useTranslations('games.list');
  const tCommon = useTranslations('common.games');

  return (
    <>
      <GamesShell
        isAuthenticated={isAuthenticated}
        initialChesscomUsername={initialChesscomUsername}
        initialLichessUsername={initialLichessUsername}
        emptyMessage={tCommon('emptyGames')}
        renderStatus={({ games, username }) =>
          t('showing', { username, count: games.length })
        }
      >
        {({ games }) => (
          <GamesList games={games} onSelect={setSelectedGame} />
        )}
      </GamesShell>

      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  );
}
