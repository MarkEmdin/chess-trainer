'use client';

import { useDeferredValue, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Loader2Icon } from 'lucide-react';
import { findLongThinks, type LongThink } from '@/lib/chesscom/longThinks';
import type { Game } from '@/lib/chesscom/types';
import { useStoredThreshold } from '@/lib/chesscom/useStoredThreshold';
import ChessComShell from '@/app/components/ChessComShell';
import LongThinkCard from './LongThinkCard';
import ThresholdSelector from './ThresholdSelector';

// Same chunk as /games — Turbopack/webpack dedupes, so opening the modal
// from either route pays for the chess engine just once.
const GameModal = dynamic(
  () => import('@/app/components/ChessComGames/GameModal'),
  { ssr: false },
);

type EnrichedThink = { think: LongThink; game: Game };

function enrich(games: Game[], thresholdSec: number): EnrichedThink[] {
  return games
    .flatMap((game) =>
      findLongThinks(game, thresholdSec).map((think) => ({ think, game })),
    )
    .sort((a, b) => b.think.seconds - a.think.seconds);
}

export default function LongThinks() {
  const [selected, setSelected] = useState<EnrichedThink | null>(null);
  const [threshold, setThreshold] = useStoredThreshold();
  // `threshold` updates synchronously for the picker button (instant
  // feedback). `deferredThreshold` lags during heavy re-renders so React
  // can keep the picker responsive — we use it for the actual filtering.
  // The mismatch between the two is what `isPending` watches.
  const deferredThreshold = useDeferredValue(threshold);
  const isPending = threshold !== deferredThreshold;
  const t = useTranslations('thinkTime');

  return (
    <>
      <ChessComShell
        emptyMessage={t('empty', { threshold: deferredThreshold })}
        renderStatus={({ games }) =>
          t('showing', {
            count: enrich(games, deferredThreshold).length,
            gameCount: games.length,
          })
        }
      >
        {({ games }) => {
          const enriched = enrich(games, deferredThreshold);
          return (
            <div className="flex flex-col gap-4">
              <ThresholdSelector value={threshold} onChange={setThreshold} />
              {isPending ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2Icon
                    aria-hidden
                    className="size-6 animate-spin"
                  />
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
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }}
      </ChessComShell>

      {selected && (
        <GameModal
          game={selected.game}
          initialIndex={selected.think.moveIndex - 1}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
