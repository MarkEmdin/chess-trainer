'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Game } from '@/lib/chesscom/types';
import ChessComShell from '@/app/components/ChessComShell';
import GamesList from './GamesList';
import GameModal from './GameModal';

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
