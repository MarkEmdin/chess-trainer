'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { Game } from '@/lib/chesscom/types';
import ChessComShell from '@/app/components/ChessComShell';
import GamesList from './GamesList';

// GameModal pulls in chess.js + react-chessboard (~heavy). Defer until the
// user actually clicks a tile — the landing experience on /games doesn't
// need the chess engine in the initial bundle.
const GameModal = dynamic(() => import('./GameModal'), { ssr: false });

export default function ChessComGames() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const t = useTranslations('games.list');
  const tCommon = useTranslations('common.chesscom');

  return (
    <>
      <ChessComShell
        emptyMessage={tCommon('emptyGames')}
        renderStatus={({ games, username }) =>
          t('showing', { username, count: games.length })
        }
      >
        {({ games }) => (
          <GamesList games={games} onSelect={setSelectedGame} />
        )}
      </ChessComShell>

      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  );
}
