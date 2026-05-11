'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Chessboard } from 'react-chessboard';
import { ClockIcon } from 'lucide-react';
import { formatSeconds } from '@/lib/chesscom/format';
import type { LongThink } from '@/lib/chesscom/longThinks';
import type { Game } from '@/lib/chesscom/types';
import { Card, CardContent } from '@/app/components/ui/card';
import GameMatchup from '@/app/components/GameMatchup';

type Props = {
  think: LongThink;
  game: Game;
  onClick: () => void;
};

// Soft yellow — classic chess "last move" highlight (matches Lichess/Chess.com
// conventions and stays readable in any theme).
const LAST_MOVE_HIGHLIGHT = 'rgba(247, 230, 88, 0.55)';

function formatMove(think: LongThink): string {
  // White moves render as "12. Nf3"; black as "12… Nf6".
  return think.color === 'white'
    ? `${think.fullMoveNumber}. ${think.san}`
    : `${think.fullMoveNumber}… ${think.san}`;
}

export default function LongThinkCard({ think, game, onClick }: Props) {
  const t = useTranslations('thinkTime');
  const tTile = useTranslations('games.tile');
  const format = useFormatter();
  const dateStr = format.dateTime(game.endTime, { dateStyle: 'medium' });

  const squareStyles: Record<string, React.CSSProperties> =
    think.lastOpponentMove
      ? {
          [think.lastOpponentMove.from]: {
            backgroundColor: LAST_MOVE_HIGHLIGHT,
          },
          [think.lastOpponentMove.to]: {
            backgroundColor: LAST_MOVE_HIGHLIGHT,
          },
        }
      : {};

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left appearance-none bg-transparent p-0 border-0 cursor-pointer"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent>
          <div className="flex gap-4">
            <div className="w-[160px] shrink-0">
              <Chessboard
                options={{
                  position: think.fenBefore,
                  boardOrientation: game.userColor,
                  allowDragging: false,
                  showNotation: false,
                  showAnimations: false,
                  squareStyles,
                }}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">
                  {formatMove(think)}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  <ClockIcon className="size-3" />
                  <span className="font-mono tabular-nums">
                    {t('thoughtFor', {
                      duration: formatSeconds(think.seconds),
                    })}
                  </span>
                </span>
              </div>
              <p className="text-sm text-foreground">
                <GameMatchup game={game} />
              </p>
              <p className="text-xs text-muted-foreground">
                {tTile(`timeClass.${game.timeClass}`)} · {dateStr}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
