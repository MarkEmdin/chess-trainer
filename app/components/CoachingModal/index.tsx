'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
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
  respondToRequest,
  type CoachingRequestState,
  type RespondState,
} from '@/lib/coaching/actions';
import { formatMoveLabel, replayAroundKey } from '@/lib/chess/replay';
import { playVariation } from '@/lib/chess/variation';
import { MAX_BODY_LENGTH, normalizeBody } from '@/lib/coaching/body';
import { cn } from '@/lib/utils';
import type { CoachingMessage, CoachingThreadData } from '@/lib/coaching/types';
import VariationBoard from './VariationBoard';
import VariationLine from './VariationLine';

type Props = {
  mode: 'student' | 'coach';
  fen: string;
  orientation: 'white' | 'black';
  // Title line, e.g. "14… Nf6"; also stored as `move_san` on a new question.
  moveLabel: string;
  subtitle?: string;
  // undefined = the student is asking a new question.
  thread: CoachingThreadData | undefined;
  // Required when a student asks a new question.
  ask?: { gameUrl: string; moveIndex: number };
  // The whole game, when known: browsable around the key position `fen`
  // (before half-move `moveIndex`, 1-based). Sent with a new question.
  game?: { pgn: string; moveIndex: number };
  onClose: () => void;
  onSubmitted?: () => void;
};

// Which message's variation the board is showing.
type ViewTarget = 'question' | number | null;

// One dialog for asking (student), answering (coach) and reading the thread
// (both). The board column hosts recording and viewing; the text column holds
// the messages and, when it's the viewer's turn to write, the form.
export default function CoachingModal({
  mode,
  fen,
  orientation,
  moveLabel,
  subtitle,
  thread,
  ask,
  game,
  onClose,
  onSubmitted,
}: Props) {
  const t = useTranslations('coaching');
  const tAdmin = useTranslations('coachingAdmin');
  const [draft, setDraft] = useState<string[] | null>(null);
  const [recording, setRecording] = useState(false);
  const [viewTarget, setViewTarget] = useState<ViewTarget>(null);
  const replay = useMemo(
    () => (game ? replayAroundKey(game.pgn, fen, game.moveIndex) : null),
    [game, fen],
  );
  const keyIndex = replay?.keyIndex ?? 0;
  const [boardIndex, setBoardIndex] = useState(keyIndex);
  // Writing and recording are tied to the key position: everything the
  // student or coach writes is about that one board.
  const atKey = !replay || boardIndex === keyIndex;
  // Controlled on purpose: React resets uncontrolled fields after every form
  // action, errors included, which would wipe a long comment.
  const [body, setBody] = useState('');
  const bodyLength = normalizeBody(body).length;
  const tooLong = bodyLength > MAX_BODY_LENGTH;

  const [askState, askAction, askPending] = useActionState<
    CoachingRequestState,
    FormData
  >(createCoachingRequest, undefined);
  const [replyState, replyAction, replyPending] = useActionState<
    RespondState,
    FormData
  >(respondToRequest, undefined);

  const state = mode === 'student' ? askState : replyState;
  // Latch on success so the form disappears without waiting for the parent
  // to refetch (SWR for the student, revalidatePath for the coach).
  const justSubmitted = !!state && 'success' in state;

  useEffect(() => {
    if (justSubmitted) onSubmitted?.();
  }, [justSubmitted, onSubmitted]);

  const canWrite =
    !justSubmitted &&
    (mode === 'student' ? !thread : thread?.responses.length === 0);

  // A sent variation starts from the key position, so viewing one (and
  // leaving it) puts the game board back there.
  function view(target: ViewTarget) {
    setBoardIndex(keyIndex);
    setViewTarget(target);
  }

  const viewing =
    viewTarget === 'question'
      ? (thread?.variation ?? null)
      : viewTarget !== null
        ? (thread?.responses[viewTarget]?.variation ?? null)
        : null;

  const questionLabel =
    mode === 'student' ? t('yourQuestion') : tAdmin('question');
  const answerLabel =
    mode === 'student' ? t('coachResponse') : tAdmin('yourResponse');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-5xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-normal text-base">
            {thread || justSubmitted ? t('threadTitle') : t('askTitle')}
          </DialogTitle>
          <DialogDescription>
            {moveLabel}
            {subtitle && ` · ${subtitle}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Same sizing idea as the game modal: as large as the screen
              allows, but leave room for the recording/viewing controls. */}
          <div className="w-full mx-auto lg:mx-0 lg:shrink-0 max-w-[max(280px,min(560px,calc(100dvh-330px)))] lg:w-[max(280px,min(560px,calc(100dvh-330px)))]">
            <VariationBoard
              fen={fen}
              orientation={orientation}
              canRecord={canWrite}
              draft={draft}
              onDraftChange={setDraft}
              viewing={viewing}
              onStopViewing={() => view(null)}
              onRecordingChange={(next) => {
                setRecording(next);
                if (next) setViewTarget(null);
              }}
              game={replay}
              boardIndex={boardIndex}
              onBoardIndexChange={setBoardIndex}
              locked={!atKey}
            />
          </div>

          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {thread && (
              <Message
                label={questionLabel}
                message={thread}
                fen={fen}
                viewDisabled={recording}
                onView={() => view('question')}
              />
            )}

            {thread && (thread.responses.length > 0 || mode === 'student') && (
              <SectionLabel label={answerLabel}>
                {thread.responses.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    {t('awaitingReply')}
                  </p>
                ) : (
                  thread.responses.map((response, i) => (
                    <MessageBody
                      key={i}
                      message={response}
                      fen={fen}
                      viewDisabled={recording}
                      onView={() => view(i)}
                    />
                  ))
                )}
              </SectionLabel>
            )}

            {justSubmitted && (
              <p className="text-sm text-muted-foreground" role="status">
                {mode === 'student' ? t('submitted') : tAdmin('sent')}
              </p>
            )}

            {canWrite && replay && !atKey && (
              <div
                role="status"
                className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground"
              >
                <p>
                  {t('game.lockedBanner', {
                    move:
                      boardIndex > 0
                        ? formatMoveLabel(replay.moves[boardIndex - 1])
                        : t('game.startPosition'),
                    keyMove: formatMoveLabel(replay.moves[keyIndex]),
                  })}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="self-start"
                  onClick={() => setBoardIndex(keyIndex)}
                >
                  {t('game.backToKey')}
                </Button>
              </div>
            )}

            {canWrite && (
              <form
                action={mode === 'student' ? askAction : replyAction}
                className="flex flex-col gap-3"
              >
                {mode === 'student' ? (
                  <>
                    <input
                      type="hidden"
                      name="game_url"
                      value={ask?.gameUrl ?? ''}
                    />
                    <input type="hidden" name="fen" value={fen} />
                    <input
                      type="hidden"
                      name="move_index"
                      value={ask?.moveIndex ?? ''}
                    />
                    <input type="hidden" name="move_san" value={moveLabel} />
                    {replay && game && (
                      <input type="hidden" name="pgn" value={game.pgn} />
                    )}
                  </>
                ) : (
                  <input type="hidden" name="request_id" value={thread?.id} />
                )}
                {draft && (
                  <input
                    type="hidden"
                    name="variation"
                    value={JSON.stringify(draft)}
                  />
                )}

                <label
                  htmlFor="coaching-body"
                  className="text-sm font-medium text-foreground"
                >
                  {mode === 'student' ? t('bodyLabel') : tAdmin('yourResponse')}
                </label>
                <Textarea
                  id="coaching-body"
                  name="body"
                  rows={6}
                  required
                  minLength={1}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={!atKey}
                  className="resize-y sm:min-h-60"
                  placeholder={
                    mode === 'student'
                      ? t('bodyPlaceholder')
                      : tAdmin('responsePlaceholder')
                  }
                />
                <p
                  className={cn(
                    'self-end text-xs text-muted-foreground',
                    tooLong && 'text-destructive',
                  )}
                >
                  {t('charCount', {
                    count: bodyLength,
                    max: MAX_BODY_LENGTH,
                  })}
                </p>

                {state && 'error' in state && (
                  <p className="text-sm text-destructive" role="alert">
                    {state.error}
                  </p>
                )}

                <div className="flex justify-end">
                  {mode === 'student' ? (
                    <Button
                      type="submit"
                      disabled={askPending || recording || tooLong || !atKey}
                    >
                      {askPending ? t('submitting') : t('submit')}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={replyPending || recording || tooLong || !atKey}
                    >
                      {replyPending ? tAdmin('sending') : tAdmin('send')}
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type MessageProps = {
  message: CoachingMessage;
  fen: string;
  viewDisabled: boolean;
  onView: () => void;
};

function Message({ label, ...rest }: MessageProps & { label: string }) {
  return (
    <SectionLabel label={label}>
      <MessageBody {...rest} />
    </SectionLabel>
  );
}

function MessageBody({ message, fen, viewDisabled, onView }: MessageProps) {
  const t = useTranslations('coaching.variation');
  const played = message.variation
    ? playVariation(fen, message.variation)
    : null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-foreground whitespace-pre-wrap">
        {message.body}
      </p>
      {played && played.moves.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <VariationLine moves={played.moves} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={viewDisabled}
            onClick={onView}
          >
            {t('view')}
          </Button>
        </div>
      )}
    </div>
  );
}
