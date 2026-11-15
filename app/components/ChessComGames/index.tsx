'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { Game } from '@/lib/games/types';
import type { AskTarget } from '@/lib/coaching/askTarget';
import { useMyCoachingRequests } from '@/lib/coaching/useMyCoachingRequests';
import GamesShell from '@/app/components/GamesShell';
import GamesList from './GamesList';

// GameModal pulls in chess.js + react-chessboard (~heavy). Defer until the
// user actually clicks a tile — the landing experience on /games doesn't
// need the chess engine in the initial bundle.
const GameModal = dynamic(() => import('./GameModal'), { ssr: false });

// Same chunk as on /think-time; only mounts once the student asks.
const AskCoachModal = dynamic(() => import('@/app/components/AskCoachModal'), {
  ssr: false,
});

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
  const [asking, setAsking] = useState<{
    game: Game;
    target: AskTarget;
  } | null>(null);
  const t = useTranslations('games.list');
  // Shares the SWR key with /think-time: one fetch for both pages.
  const { data: requestsByFen, mutate: refreshRequests } =
    useMyCoachingRequests(isAuthenticated);
  const askedFens = useMemo(
    () => new Set(Object.keys(requestsByFen ?? {})),
    [requestsByFen],
  );

  return (
    <>
      <GamesShell
        isAuthenticated={isAuthenticated}
        initialChesscomUsername={initialChesscomUsername}
        initialLichessUsername={initialLichessUsername}
        renderStatus={({ games, username }) =>
          t('showing', { username, count: games.length })
        }
      >
        {({ games, timeFilter, filterNotice }) => (
          <div className="flex flex-col gap-4">
            {timeFilter}
            {filterNotice}
            <GamesList games={games} onSelect={setSelectedGame} />
          </div>
        )}
      </GamesShell>

      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onAsk={(target) => {
            setSelectedGame(null);
            setAsking({ game: selectedGame, target });
          }}
          askedFens={askedFens}
          isAuthenticated={isAuthenticated}
        />
      )}

      {asking && (
        <AskCoachModal
          game={asking.game}
          target={asking.target}
          thread={requestsByFen?.[asking.target.fen]}
          onClose={() => setAsking(null)}
          onSubmitted={refreshRequests}
          onSeen={refreshRequests}
        />
      )}
    </>
  );
}
