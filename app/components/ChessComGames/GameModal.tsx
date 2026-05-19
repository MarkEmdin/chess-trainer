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
import { formatSeconds } from '@/lib/chesscom/format';
import type { Game, GameColor, GamePlayer } from '@/lib/chesscom/types';
import GameMatchup from '@/app/components/GameMatchup';
import { cn } from '@/lib/utils';

type ReplayMove = {
  san: string;
  color: GameColor;
  fullMoveNumber: number;
};

function buildReplay(pgn: string): {
  positions: string[];
  moves: ReplayMove[];
} {
  const parser = new Chess();
  try {
    parser.loadPgn(pgn);
  } catch {
    return { positions: [new Chess().fen()], moves: [] };
  }
  const history = parser.history({ verbose: true });
  const replay = new Chess();
  const positions = [replay.fen()];
  const moves: ReplayMove[] = [];
  history.forEach((move, i) => {
    replay.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    positions.push(replay.fen());
    moves.push({
      san: move.san,
      color: move.color === 'w' ? 'white' : 'black',
      fullMoveNumber: Math.floor(i / 2) + 1,
    });
  });
  return { positions, moves };
}

function formatMoveLabel(move: ReplayMove): string {
  return move.color === 'white'
    ? `${move.fullMoveNumber}. ${move.san}`
    : `${move.fullMoveNumber}… ${move.san}`;
}

function PlayerRow({
  player,
  pieceColor,
  clock,
  isUser,
  isActive,
}: {
  player: GamePlayer;
  pieceColor: GameColor;
  clock: string | undefined;
  isUser: boolean;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-2 py-1.5 text-sm rounded-md transition-colors',
        // Highlight whichever side is to move at the current position, so the
        // viewer can tell the game state at a glance.
        isActive && 'bg-accent/60 ring-1 ring-foreground/25',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden
          className={cn(
            'size-3 rounded-full shrink-0 border border-foreground/30',
            pieceColor === 'white' ? 'bg-white' : 'bg-black',
          )}
        />
        {isUser ? (
          <strong className="truncate font-semibold">{player.username}</strong>
        ) : (
          <span className="truncate">{player.username}</span>
        )}
        <span className="text-muted-foreground shrink-0">
          ({player.rating})
        </span>
      </div>
      {clock && (
        <span className="font-mono text-sm tabular-nums shrink-0">{clock}</span>
      )}
    </div>
  );
}

type Props = {
  game: Game;
  onClose: () => void;
  initialIndex?: number;
};

export default function GameModal({ game, onClose, initialIndex }: Props) {
  const t = useTranslations('games.modal');
  const tTile = useTranslations('games.tile');
  const format = useFormatter();
  const [index, setIndex] = useState(initialIndex ?? 0);

  const { positions, moves } = useMemo(
    () => buildReplay(game.pgn),
    [game.pgn],
  );
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

  // Side to move at the displayed position — second field of the FEN is "w" or "b".
  const sideToMove: GameColor = currentFen.split(' ')[1] === 'b' ? 'black' : 'white';

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
  let lastMoveDuration: string | undefined;
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
        lastMoveDuration = formatSeconds(spent);
      }
    }
  }

  const clocks = { white: whiteClock, black: blackClock };

  const lastMove = index > 0 ? moves[index - 1] : undefined;
  const lastMoveLabel = lastMove ? formatMoveLabel(lastMove) : undefined;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-normal text-base">
            {dateStr} · {tTile(`timeClass.${game.timeClass}`)} ·{' '}
            {tTile(`result.${game.result}`)}
          </DialogTitle>
          {/* Names are visible on the player rows; keep the matchup in a
              visually-hidden description so screen readers still announce it. */}
          <DialogDescription className="sr-only">
            <GameMatchup game={game} />
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="mx-auto w-full max-w-[400px] flex flex-col gap-1.5">
            <PlayerRow
              player={game.opponent}
              pieceColor={topColor}
              clock={clocks[topColor]}
              isUser={false}
              isActive={sideToMove === topColor}
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
              player={game.user}
              pieceColor={bottomColor}
              clock={clocks[bottomColor]}
              isUser
              isActive={sideToMove === bottomColor}
            />
          </div>

          <div className="flex items-center justify-center gap-1 flex-wrap">
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
            <span className="text-sm text-muted-foreground min-w-[100px] sm:min-w-[140px] text-center">
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

          <div className="h-5 text-xs text-muted-foreground text-center">
            {lastMoveLabel &&
              (lastMoveDuration
                ? t('lastMoveWithDuration', {
                    move: lastMoveLabel,
                    duration: lastMoveDuration,
                  })
                : t('lastMoveCaption', { move: lastMoveLabel }))}
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
