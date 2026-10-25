'use client';

import { useEffect, useMemo, useState } from 'react';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MessageSquareIcon,
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
import { sideToMove } from '@/lib/chess/fen';
import { buildReplay, formatMoveLabel } from '@/lib/chess/replay';
import type { Game, GameColor } from '@/lib/games/types';
import GameMatchup from '@/app/components/GameMatchup';
import PlayerRow from '@/app/components/PlayerRow';

// Last-move squares use the conventional chess highlight, not a theme token.
const LAST_MOVE_STYLE = { backgroundColor: 'rgba(255, 213, 79, 0.5)' };

type Props = {
  game: Game;
  onClose: () => void;
  initialIndex?: number;
  // Shown on /think-time for a position not asked about yet, mirroring the
  // card's button (spec 013).
  onAskCoach?: () => void;
};

export default function GameModal({
  game,
  onClose,
  initialIndex,
  onAskCoach,
}: Props) {
  const t = useTranslations('games.modal');
  const tCoaching = useTranslations('coaching');
  const tTile = useTranslations('games.tile');
  const format = useFormatter();
  const { positions, moves } = useMemo(
    () => buildReplay(game.pgn, game.finalFen),
    [game.pgn, game.finalFen],
  );
  const totalMoves = Math.max(0, positions.length - 1);
  const [index, setIndex] = useState(() =>
    Math.min(initialIndex ?? 0, totalMoves),
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(totalMoves, i + 1));
      else if (e.key === 'Home' || e.key === 'ArrowUp') setIndex(0);
      else if (e.key === 'End' || e.key === 'ArrowDown') setIndex(totalMoves);
      else return;
      // Home/End/ArrowUp/ArrowDown would otherwise also scroll the dialog.
      e.preventDefault();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [totalMoves]);

  const currentFen = positions[index] ?? game.finalFen;
  const dateStr = format.dateTime(game.endTime, { dateStyle: 'medium' });

  const topColor: GameColor = game.userColor === 'white' ? 'black' : 'white';
  const bottomColor: GameColor = game.userColor;

  const colorToMove: GameColor = sideToMove(currentFen);

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
  const lastMove = index > 0 ? moves[index - 1] : undefined;
  let lastMoveDuration: string | undefined;
  if (lastMove && snapshot) {
    const moverIsWhite = lastMove.color === 'white';
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

  const lastMoveSquares = lastMove
    ? { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE }
    : undefined;
  const lastMoveLabel = lastMove ? formatMoveLabel(lastMove) : undefined;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
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
          {/* Board as large as the screen allows: up to 720px, but never taller
              than the viewport minus header, player rows and controls (but never
              below 280px — short landscape screens scroll instead). */}
          <div className="mx-auto w-full max-w-[max(280px,min(720px,calc(100dvh-310px)))] flex flex-col gap-1.5">
            <PlayerRow
              player={{
                name: game.opponent.username,
                rating: game.opponent.rating,
              }}
              pieceColor={topColor}
              clock={clocks[topColor]}
              isUser={false}
              isActive={colorToMove === topColor}
            />
            <ChessboardWithNotation
              position={currentFen}
              boardOrientation={game.userColor}
              squareStyles={lastMoveSquares}
            />
            <PlayerRow
              player={{ name: game.user.username, rating: game.user.rating }}
              pieceColor={bottomColor}
              clock={clocks[bottomColor]}
              isUser
              isActive={colorToMove === bottomColor}
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

          {/* Caption and link share one row to keep vertical chrome small —
              every pixel saved here goes to the board on short laptops. */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="min-h-5 text-xs text-muted-foreground">
              {lastMoveLabel &&
                (lastMoveDuration
                  ? t('lastMoveWithDuration', {
                      move: lastMoveLabel,
                      duration: lastMoveDuration,
                    })
                  : t('lastMoveCaption', { move: lastMoveLabel }))}
            </span>
            <div className="flex gap-2 flex-wrap">
              {onAskCoach && (
                <Button variant="outline" size="sm" onClick={onAskCoach}>
                  <MessageSquareIcon className="size-4" />
                  {tCoaching('askCoach')}
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={game.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="size-4" />
                  {t('viewGame')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
