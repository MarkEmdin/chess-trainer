'use client';

import { useEffect } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import CoachingModal from '@/app/components/CoachingModal';
import { markResponseSeen } from '@/lib/coaching/actions';
import { isUnseen } from '@/lib/coaching/notifications';
import type { AskTarget } from '@/lib/coaching/askTarget';
import type { MyCoachingRequest } from '@/lib/coaching/useMyCoachingRequests';
import type { Game } from '@/lib/games/types';

type Props = {
  game: Game;
  target: AskTarget;
  // The student's earlier question about `target.fen`, from any game.
  thread?: MyCoachingRequest;
  onClose: () => void;
  onSubmitted: () => void;
  // An unseen answer was just marked read: refetch so badges drop.
  onSeen: () => void;
};

// The coaching modal for a move of a game (spec 038). One question per
// position: when the student already asked about it, possibly in another
// game, that thread opens with its own game instead of a new form.
export default function AskCoachModal({
  game,
  target,
  thread,
  onClose,
  onSubmitted,
  onSeen,
}: Props) {
  const t = useTranslations('coaching');
  const format = useFormatter();
  const gameDate = format.dateTime(game.endTime, { dateStyle: 'medium' });

  const unseenId = thread && isUnseen(thread) ? thread.id : null;
  useEffect(() => {
    if (!unseenId) return;
    void markResponseSeen(unseenId).then(onSeen, () => {});
    // Once per thread: a new onSeen identity must not mark it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenId]);

  if (thread) {
    const otherGame = !!thread.game_url && thread.game_url !== game.url;
    return (
      <CoachingModal
        mode="student"
        fen={thread.fen}
        orientation={game.userColor}
        moveLabel={thread.move_san ?? target.label}
        subtitle={otherGame ? t('askedInOtherGame') : gameDate}
        thread={thread}
        game={
          thread.pgn
            ? { pgn: thread.pgn, moveIndex: thread.move_index }
            : undefined
        }
        gameUrl={thread.game_url ?? game.url}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );
  }

  return (
    <CoachingModal
      mode="student"
      fen={target.fen}
      orientation={game.userColor}
      moveLabel={target.label}
      subtitle={gameDate}
      thread={undefined}
      ask={{ gameUrl: game.url, moveIndex: target.moveIndex }}
      game={{ pgn: game.pgn, moveIndex: target.moveIndex }}
      gameUrl={game.url}
      onClose={onClose}
      onSubmitted={onSubmitted}
    />
  );
}
