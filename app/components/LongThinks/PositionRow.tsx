'use client';

import { useFormatter, useTranslations } from 'next-intl';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';
import { formatSeconds } from '@/lib/chesscom/format';
import type { LongThink } from '@/lib/games/longThinks';
import type { Game } from '@/lib/games/types';
import type { ThreadStatus } from '@/lib/coaching/status';
import { cn } from '@/lib/utils';
import { formatThinkMove, lastMoveStyles } from './format';

type Props = {
  think: LongThink;
  game: Game;
  status: ThreadStatus;
  // An answer the student hasn't opened yet (spec 012).
  hasNewAnswer: boolean;
  selected: boolean;
  onSelect: () => void;
};

const pill = 'rounded-full px-2 py-px text-[11px] font-semibold';

export default function PositionRow({
  think,
  game,
  status,
  hasNewAnswer,
  selected,
  onSelect,
}: Props) {
  const t = useTranslations('thinkTime');
  const tCoaching = useTranslations('coaching');
  const tTile = useTranslations('games.tile');
  const format = useFormatter();

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-[10px] border bg-card p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary/40 bg-primary/5'
          : 'border-border hover:border-foreground/20',
      )}
    >
      <div className="pointer-events-none w-[52px] shrink-0 overflow-hidden rounded-[3px]">
        <ChessboardWithNotation
          position={think.fenBefore}
          boardOrientation={game.userColor}
          squareStyles={lastMoveStyles(think)}
          showCoordinates={false}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-foreground">
            {formatThinkMove(think)}
          </span>
          <span
            className={cn(
              'tabular-nums text-sm',
              selected ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {formatSeconds(think.seconds)}
          </span>
        </div>
        {status === 'none' ? (
          <span className="truncate text-xs text-muted-foreground">
            {t('versus', { name: game.opponent.username })} ·{' '}
            {tTile(`timeClass.${game.timeClass}`)} ·{' '}
            {format.dateTime(game.endTime, { dateStyle: 'medium' })}
          </span>
        ) : (
          <span
            className={cn(
              pill,
              'self-start',
              status === 'asked' && 'bg-info/15 text-info',
              status === 'answered' &&
                (hasNewAnswer
                  ? 'bg-destructive text-white'
                  : 'bg-primary/15 text-primary'),
            )}
          >
            {status === 'asked'
              ? tCoaching('status.asked')
              : tCoaching(
                  hasNewAnswer ? 'status.newAnswer' : 'status.answered',
                )}
          </span>
        )}
      </div>
    </button>
  );
}
