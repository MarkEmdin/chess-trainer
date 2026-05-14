'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { findLongThinks, type LongThink } from '@/lib/chesscom/longThinks';
import type { Game } from '@/lib/chesscom/types';
import ChessComShell from '@/app/components/ChessComShell';
import LongThinkCard from './LongThinkCard';

// Same chunk as /games — Turbopack/webpack dedupes, so opening the modal
// from either route pays for the chess engine just once.
const GameModal = dynamic(
  () => import('@/app/components/ChessComGames/GameModal'),
  { ssr: false },
);

const THRESHOLD_SECONDS = 45;

type EnrichedThink = { think: LongThink; game: Game };

function enrich(games: Game[]): EnrichedThink[] {
  return games
    .flatMap((game) =>
      findLongThinks(game, THRESHOLD_SECONDS).map((think) => ({
        think,
        game,
      })),
    )
    .sort((a, b) => b.think.seconds - a.think.seconds);
}

export default function LongThinks() {
  const [selected, setSelected] = useState<EnrichedThink | null>(null);
  const t = useTranslations('thinkTime');
  const tCommon = useTranslations('common.chesscom');

  return (
    <>
      <ChessComShell
        emptyMessage={tCommon('emptyGames')}
        renderStatus={({ games }) =>
          t('showing', {
            count: enrich(games).length,
            gameCount: games.length,
          })
        }
      >
        {({ games }) => {
          const enriched = enrich(games);
          if (enriched.length === 0) {
            // Games loaded but no moves crossed the 45s threshold — the
            // shell's "no games" message doesn't fit, so render our own.
            return <p className="text-muted-foreground">{t('empty')}</p>;
          }
          return (
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
