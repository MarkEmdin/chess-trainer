'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2Icon } from 'lucide-react';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useStoredUsername } from '@/lib/chesscom/useStoredUsername';
import { findLongThinks, type LongThink } from '@/lib/chesscom/longThinks';
import type { Game } from '@/lib/chesscom/types';
import { Button } from '@/app/components/ui/button';
import ChessComUsernameForm from '@/app/components/ChessComUsernameForm';
import GameModal from '@/app/components/ChessComGames/GameModal';
import LongThinkCard from './LongThinkCard';

const THRESHOLD_SECONDS = 45;

type EnrichedThink = { think: LongThink; game: Game };

export default function LongThinks() {
  const [username, setUsername] = useStoredUsername();
  const { games, error, isLoading, isNotFound } = useChessComGames(username);
  const [selected, setSelected] = useState<EnrichedThink | null>(null);
  const t = useTranslations('thinkTime');
  const tForm = useTranslations('games.usernameForm');

  const enrichedThinks = useMemo<EnrichedThink[]>(() => {
    if (!games) return [];
    const thinks = games.flatMap((game) =>
      findLongThinks(game, THRESHOLD_SECONDS).map((think) => ({
        think,
        game,
      })),
    );
    return thinks.sort((a, b) => b.think.seconds - a.think.seconds);
  }, [games]);

  if (!username) {
    return <ChessComUsernameForm onSubmit={setUsername} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {games && !isLoading ? (
          <p className="text-sm text-muted-foreground">
            {t('showing', {
              count: enrichedThinks.length,
              gameCount: games.length,
            })}
          </p>
        ) : (
          <span />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUsername(null)}
        >
          {tForm('change')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      )}

      {error && (
        <p className="text-destructive">
          {isNotFound ? t('errorNotFound') : t('errorGeneric')}
        </p>
      )}

      {games && !isLoading && enrichedThinks.length === 0 && (
        <p className="text-muted-foreground">{t('empty')}</p>
      )}

      {enrichedThinks.length > 0 && (
        <div className="flex flex-col gap-3">
          {enrichedThinks.map(({ think, game }) => (
            <LongThinkCard
              key={`${game.id}-${think.moveIndex}`}
              think={think}
              game={game}
              onClick={() => setSelected({ think, game })}
            />
          ))}
        </div>
      )}

      {selected && (
        <GameModal
          game={selected.game}
          initialIndex={selected.think.moveIndex - 1}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
