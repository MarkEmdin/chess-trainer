'use client';

import { useTranslations } from 'next-intl';
import type { PgnPlayer } from '@/lib/chess/pgnInfo';
import type { GameColor } from '@/lib/games/types';
import { cn } from '@/lib/utils';

// One player above or below a board: color, name, rating, clock, and who is
// to move. Shared by the games modal and the coaching modal.
export default function PlayerRow({
  player,
  pieceColor,
  clock,
  isUser,
  isActive,
  note,
}: {
  player: PgnPlayer;
  pieceColor: GameColor;
  clock: string | undefined;
  isUser: boolean;
  isActive: boolean;
  // Short marker after the color, e.g. "asked the question".
  note?: string;
}) {
  const t = useTranslations('games.modal');
  return (
    <div
      data-slot="player-row"
      className={cn(
        'flex items-center justify-between gap-3 pl-2 pr-2 py-1.5 text-sm rounded-md border-l-4 transition-colors',
        // Whoever is to move at the current position gets a strong marker,
        // plus the "To move" text below their name.
        isActive ? 'border-primary bg-accent/60' : 'border-transparent',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden
          className={cn(
            'size-4 rounded-full shrink-0 border border-foreground/40',
            pieceColor === 'white' ? 'bg-white' : 'bg-black',
          )}
        />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {isUser ? (
              <strong className="truncate font-semibold">{player.name}</strong>
            ) : (
              <span className="truncate">{player.name}</span>
            )}
            {player.rating !== undefined && (
              <span className="text-muted-foreground shrink-0">
                ({player.rating})
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {t(pieceColor)}
            {isActive && ` · ${t('toMove')}`}
            {note && ` · ${note}`}
          </span>
        </div>
      </div>
      {clock && (
        <span className="font-mono text-base tabular-nums shrink-0">
          {clock}
        </span>
      )}
    </div>
  );
}
