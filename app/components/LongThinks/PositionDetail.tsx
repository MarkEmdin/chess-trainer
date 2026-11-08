'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ArrowLeftIcon, MessageSquareIcon } from 'lucide-react';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';
import { Button, buttonVariants } from '@/app/components/ui/button';
import LikedMark from '@/app/components/LikedMark';
import SectionLabel from '@/app/components/SectionLabel';
import { Link } from '@/i18n/navigation';
import { formatSeconds } from '@/lib/chesscom/format';
import type { LongThink } from '@/lib/games/longThinks';
import type { Game, GameColor, GamePlayer } from '@/lib/games/types';
import { cn } from '@/lib/utils';
import { useAnswerLabels } from '@/lib/coaches/useCoachName';
import { tapToOpen } from '@/lib/tapToOpen';
import type { CoachProfile } from '@/lib/coaches/displayName';
import { formatThinkMove, lastMoveStyles } from './format';

type Props = {
  think: LongThink;
  game: Game;
  thread?: {
    body: string;
    responses: {
      body: string;
      author?: CoachProfile | null;
      liked?: boolean;
    }[];
  };
  isAuthenticated: boolean;
  // Opens the coaching modal: a new question, or the existing thread. For a
  // guest it fires on the way to registration.
  onAskCoach: () => void;
  onOpenGame: () => void;
  // Mobile full-screen view only: back to the list, and where we are in it.
  onBack?: () => void;
  counter?: { n: number; total: number };
};

function Player({
  player,
  color,
  isUser,
}: {
  player: GamePlayer;
  color: GameColor;
  isUser: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={cn(
            'size-3 shrink-0 rounded-full border border-foreground/30',
            color === 'white' ? 'bg-white' : 'bg-black',
          )}
        />
        <span className={cn('truncate', isUser && 'font-semibold')}>
          {player.username}
        </span>
      </span>
      <span className="tabular-nums text-muted-foreground">
        {player.rating}
      </span>
    </div>
  );
}

export default function PositionDetail({
  think,
  game,
  thread,
  isAuthenticated,
  onAskCoach,
  onOpenGame,
  onBack,
  counter,
}: Props) {
  const t = useTranslations('thinkTime.detail');
  const tCoaching = useTranslations('coaching');
  const answerLabels = useAnswerLabels();
  const tTile = useTranslations('games.tile');
  const format = useFormatter();
  // With a thread, the board and its preview open it too: a bigger target
  // than the button on phones. Without one, the board stays inert.
  const openOnTap =
    thread && isAuthenticated ? tapToOpen(onAskCoach) : undefined;
  const opponentColor: GameColor =
    game.userColor === 'white' ? 'black' : 'white';

  return (
    <div className="flex flex-col gap-4">
      {onBack && (
        <div className="flex items-center justify-between lg:hidden">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon />
            {t('back')}
          </Button>
          {counter && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {t('counter', counter)}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 xl:flex-row">
        <div
          onClick={openOnTap}
          className={cn('w-full max-w-[460px]', openOnTap && 'cursor-pointer')}
        >
          <ChessboardWithNotation
            position={think.fenBefore}
            boardOrientation={game.userColor}
            squareStyles={lastMoveStyles(think)}
          />
        </div>

        <div className="flex flex-col gap-4 xl:w-[250px] xl:shrink-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('youThought')}
            </p>
            <p className="text-3xl font-extrabold tabular-nums text-primary">
              {formatSeconds(think.seconds)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('overMove')}{' '}
              <b className="text-foreground">{formatThinkMove(think)}</b>
            </p>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <Player
              player={game.opponent}
              color={opponentColor}
              isUser={false}
            />
            <Player player={game.user} color={game.userColor} isUser />
            <p className="text-xs text-muted-foreground">
              {tTile(`timeClass.${game.timeClass}`)} ·{' '}
              {format.dateTime(game.endTime, { dateStyle: 'medium' })} ·{' '}
              {tTile(`result.${game.result}`)}
            </p>
          </div>

          {thread && (
            <div
              onClick={openOnTap}
              className={cn(
                'flex flex-col gap-2 rounded-[10px] border border-border bg-card p-3',
                openOnTap &&
                  'cursor-pointer transition-colors hover:border-foreground/20',
              )}
            >
              <SectionLabel label={tCoaching('yourQuestion')}>
                <p className="line-clamp-2 text-sm">{thread.body}</p>
              </SectionLabel>
              {thread.responses.length === 0 ? (
                <SectionLabel label={answerLabels.forStudent()}>
                  <p className="text-sm italic text-muted-foreground">
                    {tCoaching('awaitingReply')}
                  </p>
                </SectionLabel>
              ) : (
                thread.responses.map((r, i) => (
                  <SectionLabel key={i} label={answerLabels.forStudent(r)}>
                    <p className="line-clamp-3 text-sm">{r.body}</p>
                    <LikedMark message={r} />
                  </SectionLabel>
                ))
              )}
            </div>
          )}

          {isAuthenticated ? (
            <Button type="button" onClick={onAskCoach}>
              <MessageSquareIcon />
              {thread ? t('openQuestion') : tCoaching('askCoach')}
            </Button>
          ) : (
            <>
              <Link
                href="/register"
                onClick={onAskCoach}
                className={buttonVariants()}
              >
                <MessageSquareIcon />
                {tCoaching('askCoach')}
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                {t('accountNeeded')}
              </p>
            </>
          )}
          <Button type="button" variant="secondary" onClick={onOpenGame}>
            {t('openGame')}
          </Button>
        </div>
      </div>
    </div>
  );
}
