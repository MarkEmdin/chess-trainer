'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { Game } from '@/lib/chesscom/types';
import { Card, CardContent } from '@/app/components/ui/card';

const RESULT_STYLES: Record<Game['result'], string> = {
  win: 'bg-green-600/10 text-green-700 dark:text-green-400',
  loss: 'bg-destructive/10 text-destructive',
  draw: 'bg-muted text-muted-foreground',
};

type Props = {
  game: Game;
  onClick: () => void;
};

export default function GameTile({ game, onClick }: Props) {
  const t = useTranslations('games.tile');
  const format = useFormatter();
  const dateStr = format.dateTime(game.endTime, { dateStyle: 'medium' });

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left appearance-none bg-transparent p-0 border-0 cursor-pointer"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${RESULT_STYLES[game.result]}`}
                >
                  {t(`result.${game.result}`)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`timeClass.${game.timeClass}`)}
                </span>
              </div>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{game.user.username}</span>
                <span className="text-muted-foreground">
                  {' '}({game.user.rating})
                </span>
                {' vs '}
                {game.opponent.username}
                <span className="text-muted-foreground">
                  {' '}({game.opponent.rating})
                </span>
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {dateStr}
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
