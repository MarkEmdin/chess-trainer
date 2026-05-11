'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import type { Game, GameColor, GamePlayer } from '@/lib/chesscom/types';

function buildPositions(pgn: string): string[] {
  const parser = new Chess();
  try {
    parser.loadPgn(pgn);
  } catch {
    return [new Chess().fen()];
  }
  const history = parser.history({ verbose: true });
  const replay = new Chess();
  const positions = [replay.fen()];
  for (const move of history) {
    replay.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    positions.push(replay.fen());
  }
  return positions;
}

function formatSeconds(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function PlayerRow({
  label,
  player,
  clock,
  timeSpent,
  isUser,
}: {
  label: string;
  player: GamePlayer;
  clock: string | undefined;
  timeSpent: string | undefined;
  isUser: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-2 py-1.5 text-sm rounded-md ${isUser ? 'bg-accent/40' : ''}`}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">
          {label}
        </span>
        <span className="font-medium truncate">{player.username}</span>
        <span className="text-muted-foreground shrink-0">
          ({player.rating})
        </span>
      </div>
      {clock && (
        <span className="font-mono text-sm tabular-nums shrink-0">
          {clock}
          {timeSpent && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              −{timeSpent}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

type Props = {
  game: Game;
  onClose: () => void;
};

export default function GameModal({ game, onClose }: Props) {
  const t = useTranslations('games.modal');
  const tTile = useTranslations('games.tile');
  const format = useFormatter();
  const [index, setIndex] = useState(0);

  const positions = useMemo(() => buildPositions(game.pgn), [game.pgn]);
  const totalMoves = Math.max(0, positions.length - 1);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(totalMoves, i + 1));
      else if (e.key === 'Home') setIndex(0);
      else if (e.key === 'End') setIndex(totalMoves);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [totalMoves]);

  const currentFen = positions[index] ?? game.finalFen;
  const dateStr = format.dateTime(game.endTime, { dateStyle: 'medium' });

  const topColor: GameColor = game.userColor === 'white' ? 'black' : 'white';
  const bottomColor: GameColor = game.userColor;

  // Clocks at the currently displayed position.
  const snapshot = game.clockSnapshots?.[index];
  const whiteClock =
    snapshot?.whiteSeconds !== undefined
      ? formatSeconds(snapshot.whiteSeconds)
      : undefined;
  const blackClock =
    snapshot?.blackSeconds !== undefined
      ? formatSeconds(snapshot.blackSeconds)
      : undefined;

  // Time spent by whoever just moved into this position.
  // Formula: (prevClock + increment) − currentClock — increment cancels out
  // the gain the player received for completing the move, leaving raw thinking time.
  let timeSpentColor: GameColor | undefined;
  let timeSpentFormatted: string | undefined;
  if (index > 0 && snapshot) {
    const moverIsWhite = index % 2 === 1;
    const prev = game.clockSnapshots?.[Math.max(0, index - 2)];
    const prevSec = moverIsWhite ? prev?.whiteSeconds : prev?.blackSeconds;
    const currSec = moverIsWhite
      ? snapshot.whiteSeconds
      : snapshot.blackSeconds;
    if (prevSec !== undefined && currSec !== undefined) {
      const spent = prevSec + game.increment - currSec;
      if (spent >= 0) {
        timeSpentColor = moverIsWhite ? 'white' : 'black';
        timeSpentFormatted = formatSeconds(spent);
      }
    }
  }

  const clocks = { white: whiteClock, black: blackClock };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {tTile('vs', { opponent: game.opponent.username })}{' '}
            <span className="text-muted-foreground text-base font-normal">
              ({game.opponent.rating})
            </span>
          </DialogTitle>
          <DialogDescription>
            {dateStr} · {tTile(`timeClass.${game.timeClass}`)} ·{' '}
            {tTile(`result.${game.result}`)}
            {game.opening ? ` · ${game.opening}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="mx-auto w-full max-w-[400px] flex flex-col gap-1.5">
            <PlayerRow
              label={t(topColor)}
              player={game.opponent}
              clock={clocks[topColor]}
              timeSpent={
                timeSpentColor === topColor ? timeSpentFormatted : undefined
              }
              isUser={false}
            />
            <Chessboard
              options={{
                position: currentFen,
                boardOrientation: game.userColor,
                allowDragging: false,
                animationDurationInMs: 150,
              }}
            />
            <PlayerRow
              label={t(bottomColor)}
              player={game.user}
              clock={clocks[bottomColor]}
              timeSpent={
                timeSpentColor === bottomColor
                  ? timeSpentFormatted
                  : undefined
              }
              isUser
            />
          </div>

          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('firstMove')}
              onClick={() => setIndex(0)}
              disabled={index === 0}
            >
              <ChevronFirstIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('prevMove')}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[140px] text-center">
              {index === 0
                ? t('startPosition')
                : t('moveCounter', { current: index, total: totalMoves })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('nextMove')}
              onClick={() => setIndex((i) => Math.min(totalMoves, i + 1))}
              disabled={index === totalMoves}
            >
              <ChevronRightIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('lastMove')}
              onClick={() => setIndex(totalMoves)}
              disabled={index === totalMoves}
            >
              <ChevronLastIcon />
            </Button>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <a
                href={game.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="size-4" />
                {t('viewOnChessCom')}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
