'use client';

import { useDeferredValue, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Loader2Icon } from 'lucide-react';
import { collectLongThinks, type LongThink } from '@/lib/games/longThinks';
import type { Game } from '@/lib/games/types';
import { useStoredThreshold } from '@/lib/chesscom/useStoredThreshold';
import { useMyCoachingRequests } from '@/lib/coaching/useMyCoachingRequests';
import GamesShell from '@/app/components/GamesShell';
import LongThinkCard from './LongThinkCard';
import ThresholdSelector from './ThresholdSelector';

// Same chunk as /games — Turbopack/webpack dedupes, so opening the modal
// from either route pays for the chess engine just once.
const GameModal = dynamic(
  () => import('@/app/components/ChessComGames/GameModal'),
  { ssr: false },
);

// Coaching modal pulls in react-chessboard too but only mounts when a
// signed-in user clicks "Ask coach" — defer to keep it out of the
// first render budget.
const CoachingModal = dynamic(() => import('@/app/components/CoachingModal'), {
  ssr: false,
});

type EnrichedThink = { think: LongThink; game: Game };

function formatThinkMove(think: LongThink): string {
  return think.color === 'white'
    ? `${think.fullMoveNumber}. ${think.san}`
    : `${think.fullMoveNumber}… ${think.san}`;
}

type Props = {
  isAuthenticated: boolean;
  initialChesscomUsername: string | null;
  initialLichessUsername: string | null;
};

export default function LongThinks({
  isAuthenticated,
  initialChesscomUsername,
  initialLichessUsername,
}: Props) {
  const [selected, setSelected] = useState<EnrichedThink | null>(null);
  const [coachingTarget, setCoachingTarget] = useState<EnrichedThink | null>(
    null,
  );
  const [threshold, setThreshold] = useStoredThreshold();
  // Only fetched when signed in (the hook handles the gating). Map is
  // keyed by fen so each card can do an O(1) "do I have a thread for
  // this position?" lookup.
  const { data: requestsByFen, mutate: refreshRequests } =
    useMyCoachingRequests(isAuthenticated);
  // `threshold` updates synchronously for the picker button (instant
  // feedback). `deferredThreshold` lags during heavy re-renders so React
  // can keep the picker responsive — we use it for the actual filtering.
  // The mismatch between the two is what `isPending` watches.
  const deferredThreshold = useDeferredValue(threshold);
  const isPending = threshold !== deferredThreshold;
  const t = useTranslations('thinkTime');
  const format = useFormatter();

  return (
    <>
      <GamesShell
        isAuthenticated={isAuthenticated}
        initialChesscomUsername={initialChesscomUsername}
        initialLichessUsername={initialLichessUsername}
        emptyMessage={t('empty', { threshold: deferredThreshold })}
        renderStatus={({ games }) =>
          t('showing', {
            count: collectLongThinks(games, deferredThreshold).length,
            gameCount: games.length,
          })
        }
      >
        {({ games }) => {
          const enriched = collectLongThinks(games, deferredThreshold);
          return (
            <div className="flex flex-col gap-4">
              <ThresholdSelector value={threshold} onChange={setThreshold} />
              {isPending ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2Icon aria-hidden className="size-6 animate-spin" />
                </div>
              ) : enriched.length === 0 ? (
                <p className="text-muted-foreground">
                  {t('empty', { threshold: deferredThreshold })}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {enriched.map(({ think, game }) => (
                    <LongThinkCard
                      key={`${game.id}-${think.moveIndex}`}
                      think={think}
                      game={game}
                      onClick={() => setSelected({ think, game })}
                      showCoachingButton={isAuthenticated}
                      existingThread={!!requestsByFen?.[think.fenBefore]}
                      onAskCoach={() => setCoachingTarget({ think, game })}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }}
      </GamesShell>

      {selected && (
        <GameModal
          game={selected.game}
          initialIndex={selected.think.moveIndex - 1}
          onClose={() => setSelected(null)}
        />
      )}

      {coachingTarget && (
        <CoachingModal
          mode="student"
          fen={coachingTarget.think.fenBefore}
          orientation={coachingTarget.game.userColor}
          moveLabel={formatThinkMove(coachingTarget.think)}
          subtitle={format.dateTime(coachingTarget.game.endTime, {
            dateStyle: 'medium',
          })}
          thread={requestsByFen?.[coachingTarget.think.fenBefore]}
          ask={{
            gameUrl: coachingTarget.game.url,
            moveIndex: coachingTarget.think.moveIndex,
          }}
          game={{
            pgn: coachingTarget.game.pgn,
            moveIndex: coachingTarget.think.moveIndex,
          }}
          gameUrl={coachingTarget.game.url}
          onClose={() => setCoachingTarget(null)}
          onSubmitted={refreshRequests}
        />
      )}
    </>
  );
}
