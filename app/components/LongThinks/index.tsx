'use client';

import { useDeferredValue, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Loader2Icon } from 'lucide-react';
import { collectLongThinks, type LongThink } from '@/lib/games/longThinks';
import type { Game } from '@/lib/games/types';
import { useStoredThreshold } from '@/lib/chesscom/useStoredThreshold';
import { useMyCoachingRequests } from '@/lib/coaching/useMyCoachingRequests';
import { threadStatus } from '@/lib/coaching/status';
import { isUnseen } from '@/lib/coaching/notifications';
import { markResponseSeen } from '@/lib/coaching/actions';
import {
  ASKED_FILTERS,
  matchesAskedFilter,
  type AskedFilter,
} from '@/lib/coaching/askedFilter';
import { Button } from '@/app/components/ui/button';
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
  const [askedFilter, setAskedFilter] = useState<AskedFilter>('all');
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

  // Opening the thread shows the coach's answer in full, so an unseen one
  // counts as read (spec 012); refetch so the badge drops.
  function openCoaching(target: EnrichedThink) {
    setCoachingTarget(target);
    const thread = requestsByFen?.[target.think.fenBefore];
    if (thread && isUnseen(thread)) {
      void markResponseSeen(thread.id).then(
        () => refreshRequests(),
        () => {},
      );
    }
  }

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
          const enriched = collectLongThinks(games, deferredThreshold).map(
            (item) => {
              const thread = requestsByFen?.[item.think.fenBefore];
              return {
                ...item,
                thread,
                status: threadStatus(thread),
                hasNewAnswer: !!thread && isUnseen(thread),
              };
            },
          );
          const shown = enriched.filter((item) =>
            matchesAskedFilter(item.status, askedFilter),
          );
          return (
            <div className="flex flex-col gap-4">
              <ThresholdSelector value={threshold} onChange={setThreshold} />
              {isAuthenticated && enriched.length > 0 && (
                <div className="flex gap-2 flex-wrap" role="tablist">
                  {ASKED_FILTERS.map((key) => (
                    <Button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={askedFilter === key}
                      variant={askedFilter === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAskedFilter(key)}
                    >
                      {t(`askedFilter.${key}`, {
                        count: enriched.filter((item) =>
                          matchesAskedFilter(item.status, key),
                        ).length,
                      })}
                    </Button>
                  ))}
                </div>
              )}
              {isPending ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2Icon aria-hidden className="size-6 animate-spin" />
                </div>
              ) : enriched.length === 0 ? (
                <p className="text-muted-foreground">
                  {t('empty', { threshold: deferredThreshold })}
                </p>
              ) : shown.length === 0 ? (
                <p className="text-muted-foreground">
                  {t(askedFilter === 'unasked' ? 'emptyUnasked' : 'emptyAsked')}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {shown.map(
                    ({ think, game, thread, status, hasNewAnswer }) => (
                      <LongThinkCard
                        key={`${game.id}-${think.moveIndex}`}
                        think={think}
                        game={game}
                        // Asked positions open the thread (it browses the
                        // game too); the rest open the game (spec 013).
                        onClick={() =>
                          thread
                            ? openCoaching({ think, game })
                            : setSelected({ think, game })
                        }
                        showCoachingButton={isAuthenticated}
                        threadStatus={status}
                        thread={thread}
                        hasNewAnswer={hasNewAnswer}
                        onAskCoach={() => openCoaching({ think, game })}
                      />
                    ),
                  )}
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
          onAskCoach={
            isAuthenticated
              ? () => {
                  setSelected(null);
                  openCoaching(selected);
                }
              : undefined
          }
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
