'use client';

import { useActionState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import ChessboardContainer from '@/app/components/ChessboardContainer';
import SectionLabel from '@/app/components/SectionLabel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  createCoachingRequest,
  type CoachingRequestState,
} from '@/lib/coaching/actions';
import type { LongThink } from '@/lib/chesscom/longThinks';
import type { Game } from '@/lib/chesscom/types';
import type { MyCoachingRequest } from '@/lib/coaching/useMyCoachingRequests';

type Props = {
  think: LongThink;
  game: Game;
  existingRequest: MyCoachingRequest | undefined;
  onClose: () => void;
  onSubmitted: () => void;
};

function formatMove(think: LongThink): string {
  return think.color === 'white'
    ? `${think.fullMoveNumber}. ${think.san}`
    : `${think.fullMoveNumber}… ${think.san}`;
}

export default function CoachingRequestModal({
  think,
  game,
  existingRequest,
  onClose,
  onSubmitted,
}: Props) {
  const t = useTranslations('coaching');
  const format = useFormatter();
  const [state, formAction, pending] = useActionState<
    CoachingRequestState,
    FormData
  >(createCoachingRequest, undefined);

  // Show the thread view if either (a) the user already had a request
  // before opening this modal, or (b) the create action just succeeded.
  // Latching on success means we don't need to wait for the SWR refetch
  // to flip the UI — `onSubmitted` runs in parallel for the parent.
  const justSubmitted = state && 'success' in state;
  const isThreadView = !!existingRequest || justSubmitted;

  if (justSubmitted) {
    onSubmitted();
  }

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
            {isThreadView ? t('threadTitle') : t('askTitle')}
          </DialogTitle>
          <DialogDescription>
            {formatMove(think)} ·{' '}
            {format.dateTime(game.endTime, { dateStyle: 'medium' })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-4">
          <ChessboardContainer
            position={think.fenBefore}
            orientation={game.userColor}
            variant="modal"
          />

          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {isThreadView ? (
              <ThreadView request={existingRequest} justSubmitted={!!justSubmitted} />
            ) : (
              <form action={formAction} className="flex flex-col gap-3">
                {/* Position snapshot — server-side validation only reads
                    these, but they need to ride along on every submit. */}
                <input type="hidden" name="game_url" value={game.url} />
                <input type="hidden" name="fen" value={think.fenBefore} />
                <input
                  type="hidden"
                  name="move_index"
                  value={think.moveIndex}
                />
                <input
                  type="hidden"
                  name="move_san"
                  value={formatMove(think)}
                />

                <label
                  htmlFor="coaching-body"
                  className="text-sm font-medium text-foreground"
                >
                  {t('bodyLabel')}
                </label>
                <Textarea
                  id="coaching-body"
                  name="body"
                  rows={6}
                  required
                  minLength={1}
                  maxLength={4000}
                  className="resize-y"
                  placeholder={t('bodyPlaceholder')}
                />

                {state && 'error' in state && (
                  <p className="text-sm text-destructive" role="alert">
                    {state.error}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={pending}>
                    {pending ? t('submitting') : t('submit')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThreadView({
  request,
  justSubmitted,
}: {
  request: MyCoachingRequest | undefined;
  justSubmitted: boolean;
}) {
  const t = useTranslations('coaching');
  // Right after submission we may not have the new request data yet
  // (SWR refetch still in flight). Show a neutral confirmation in that
  // case — the next mount will render the real thread.
  if (!request && justSubmitted) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {t('submitted')}
      </p>
    );
  }
  if (!request) return null;

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel label={t('yourQuestion')}>
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {request.body}
        </p>
      </SectionLabel>

      <SectionLabel label={t('coachResponse')}>
        {request.responses.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {t('awaitingReply')}
          </p>
        ) : (
          request.responses.map((r, i) => (
            <p
              key={i}
              className="text-sm text-foreground whitespace-pre-wrap"
            >
              {r.body}
            </p>
          ))
        )}
      </SectionLabel>
    </div>
  );
}
