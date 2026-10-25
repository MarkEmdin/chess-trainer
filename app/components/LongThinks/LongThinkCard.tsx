'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { CheckIcon, ClockIcon, MessageSquareIcon } from 'lucide-react';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';
import { formatSeconds } from '@/lib/chesscom/format';
import type { LongThink } from '@/lib/games/longThinks';
import type { Game, GamePlayer } from '@/lib/games/types';
import type { ThreadStatus } from '@/lib/coaching/status';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import SectionLabel from '@/app/components/SectionLabel';
import { cn } from '@/lib/utils';

type Props = {
  think: LongThink;
  game: Game;
  onClick: () => void;
  // Coaching surface — only meaningful for signed-in users. Once asked,
  // `threadStatus` adds a badge and `thread` previews the question and the
  // latest answer in place of the "Ask coach" button; the card click then
  // opens the thread (the container decides, spec 013).
  showCoachingButton: boolean;
  threadStatus: ThreadStatus;
  thread?: { body: string; responses: { body: string }[] };
  // An answer the student hasn't opened yet (spec 012).
  hasNewAnswer: boolean;
  onAskCoach: () => void;
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

function PlayerRow({
  player,
  pieceColor,
  isUser,
}: {
  player: GamePlayer;
  pieceColor: 'white' | 'black';
  isUser: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0 text-sm">
      <span
        aria-hidden
        className={cn(
          'size-3 rounded-full shrink-0 border border-foreground/30',
          pieceColor === 'white' ? 'bg-white' : 'bg-black',
        )}
      />
      {isUser ? (
        <strong className="truncate text-foreground">{player.username}</strong>
      ) : (
        <span className="truncate text-foreground">{player.username}</span>
      )}
      <span className="text-xs text-muted-foreground shrink-0">
        ({player.rating})
      </span>
    </div>
  );
}

export default function LongThinkCard({
  think,
  game,
  onClick,
  showCoachingButton,
  threadStatus,
  thread,
  hasNewAnswer,
  onAskCoach,
}: Props) {
  const t = useTranslations('thinkTime');
  const tCoaching = useTranslations('coaching');
  const tTile = useTranslations('games.tile');
  const format = useFormatter();
  const dateStr = format.dateTime(game.endTime, { dateStyle: 'medium' });
  const latestResponse = thread?.responses.at(-1);

  // Board is oriented so the user is at the bottom — opponent labels the top
  // row, user labels the bottom row. Each player's piece color flips with
  // game.userColor.
  const userIsWhite = game.userColor === 'white';
  const topPieceColor: 'white' | 'black' = userIsWhite ? 'black' : 'white';
  const bottomPieceColor: 'white' | 'black' = userIsWhite ? 'white' : 'black';

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

  // Outer was a <button> when the card's only action was opening the
  // game modal. The coaching button as a sibling forced a refactor —
  // nested <button>s are invalid HTML, so the outer becomes a focusable
  // div and the coaching button stops propagation so it doesn't also
  // fire onClick.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="block w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="w-[220px] mx-auto sm:w-[200px] sm:mx-0 sm:shrink-0 flex flex-col gap-1.5">
              <PlayerRow
                player={game.opponent}
                pieceColor={topPieceColor}
                isUser={false}
              />
              <div className="pointer-events-none">
                <ChessboardWithNotation
                  position={think.fenBefore}
                  boardOrientation={game.userColor}
                  squareStyles={squareStyles}
                />
              </div>
              <PlayerRow
                player={game.user}
                pieceColor={bottomPieceColor}
                isUser
              />
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
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
                {threadStatus === 'asked' && (
                  <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    <MessageSquareIcon className="size-3" />
                    {tCoaching('status.asked')}
                  </span>
                )}
                {threadStatus === 'answered' && hasNewAnswer && (
                  <span className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-0.5 text-xs font-medium text-white">
                    <CheckIcon className="size-3" />
                    {tCoaching('status.newAnswer')}
                  </span>
                )}
                {threadStatus === 'answered' && !hasNewAnswer && (
                  <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <CheckIcon className="size-3" />
                    {tCoaching('status.answered')}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {tTile(`timeClass.${game.timeClass}`)} · {dateStr}
              </p>
              {thread && (
                <>
                  <SectionLabel label={tCoaching('yourQuestion')}>
                    <p className="text-sm text-foreground line-clamp-2">
                      {thread.body}
                    </p>
                  </SectionLabel>
                  <SectionLabel label={tCoaching('coachResponse')}>
                    {latestResponse ? (
                      <p className="text-sm text-foreground line-clamp-2">
                        {latestResponse.body}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {tCoaching('awaitingReply')}
                      </p>
                    )}
                  </SectionLabel>
                </>
              )}
              {showCoachingButton && !thread && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAskCoach();
                  }}
                  className="self-start mt-1"
                >
                  <MessageSquareIcon className="size-3.5" />
                  {tCoaching('askCoach')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
