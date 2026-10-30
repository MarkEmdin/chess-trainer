'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { JSONContent } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import { ExternalLinkIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import SectionLabel from '@/app/components/SectionLabel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import TelegramPrompt from '@/app/components/TelegramPrompt';
import {
  createCoachingRequest,
  respondToRequest,
  type CoachingRequestState,
  type RespondState,
} from '@/lib/coaching/actions';
import { sideToMove } from '@/lib/chess/fen';
import { readPgnInfo } from '@/lib/chess/pgnInfo';
import { replayAroundKey } from '@/lib/chess/replay';
import { playVariation } from '@/lib/chess/variation';
import { MAX_BODY_LENGTH } from '@/lib/coaching/body';
import { contentToPlainText, type Segment } from '@/lib/coaching/content';
import {
  boardFen,
  boardLastMove,
  clearDrawings,
  currentDrawing,
  recorderContent,
  toggleMark,
} from '@/lib/coaching/moveRecorder';
import {
  clearDraft,
  draftKey,
  loadDraft,
  saveDraft,
} from '@/lib/coaching/drafts';
import { cn } from '@/lib/utils';
import type { CoachingMessage, CoachingThreadData } from '@/lib/coaching/types';
import MessageContentView from './MessageContentView';
import MoveEditor, { useRecorderStore, type MoveEditorApi } from './MoveEditor';
import VariationBoard, { type ViewedLine } from './VariationBoard';
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
  // Link to the game on its platform; works for older questions too.
  gameUrl?: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

const DRAFT_SAVE_DELAY_MS = 500;

// The line the board is showing, and which chip (or old variation) of
// which message opened it, so that chip can be highlighted.
type Viewing = ViewedLine & { key: string };

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
  gameUrl,
  onClose,
  onSubmitted,
}: Props) {
  const t = useTranslations('coaching');
  const tAdmin = useTranslations('coachingAdmin');
  const [recording, setRecording] = useState(false);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  // Unsent text survives an accidental close (spec 012): one draft per
  // question being asked or per request being answered.
  // Fixed when the modal opens: after sending, the refreshed thread no
  // longer needs a draft, but the one just sent still has to be cleared.
  const [draftId] = useState(() => {
    if (mode === 'student') {
      return !thread && ask
        ? draftKey({
            kind: 'ask',
            gameUrl: ask.gameUrl,
            moveIndex: ask.moveIndex,
          })
        : null;
    }
    return thread && thread.responses.length === 0
      ? draftKey({ kind: 'reply', requestId: thread.id })
      : null;
  });
  const [draft] = useState(() => (draftId ? loadDraft(draftId, fen) : null));
  const store = useRecorderStore(fen, draft?.recorder);
  const draftDoc = useRef<JSONContent | null>(draft?.doc ?? null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorApi = useRef<MoveEditorApi>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const boardColumn = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const replay = useMemo(() => {
    if (!game) return null;
    const around = replayAroundKey(game.pgn, fen, game.moveIndex);
    return around && { ...around, ...readPgnInfo(game.pgn) };
  }, [game, fen]);
  // The key move is the student's, so the side to move there is theirs.
  const askerColor = sideToMove(fen);
  const colorLabel = t(`color.${askerColor}`);
  const keyIndex = replay?.keyIndex ?? 0;
  const [boardIndex, setBoardIndex] = useState(keyIndex);
  const content = recorderContent(store.state, segments);
  const plainText = contentToPlainText(fen, content).trim();
  const tooLong = plainText.length > MAX_BODY_LENGTH;

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

  // The save waiting out the delay; run at once if the modal closes first,
  // so a quick accidental close keeps the last edit too.
  const pendingSave = useRef<(() => void) | null>(null);
  const cancelPendingSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    pendingSave.current = null;
  }, []);

  const scheduleDraftSave = useCallback(() => {
    if (!draftId || justSubmitted || !draftDoc.current) return;
    cancelPendingSave();
    const save = () => {
      if (draftDoc.current) {
        saveDraft(draftId, { doc: draftDoc.current, recorder: store.get() });
      }
    };
    pendingSave.current = save;
    saveTimer.current = setTimeout(() => {
      pendingSave.current = null;
      save();
    }, DRAFT_SAVE_DELAY_MS);
  }, [draftId, justSubmitted, store, cancelPendingSave]);

  // Drawings change the recorder without touching the text.
  useEffect(scheduleDraftSave, [store.state, scheduleDraftSave]);

  useEffect(() => {
    if (!justSubmitted || !draftId) return;
    cancelPendingSave();
    clearDraft(draftId);
  }, [justSubmitted, draftId, cancelPendingSave]);

  useEffect(
    () => () => {
      const save = pendingSave.current;
      cancelPendingSave();
      save?.();
    },
    [cancelPendingSave],
  );

  const canWrite =
    !justSubmitted &&
    (mode === 'student' ? !thread : thread?.responses.length === 0);

  // Every line starts from the key position, so viewing one (and leaving
  // it) puts the game board back there.
  function view(next: Viewing | null) {
    setBoardIndex(keyIndex);
    setRecording(false);
    setViewing(next);
  }

  // Writing is about the key position: focusing the text shows it, and the
  // board records into the text until a click lands outside the board and
  // the form.
  function startRecording() {
    setBoardIndex(keyIndex);
    setViewing(null);
    setRecording(true);
  }

  useEffect(() => {
    if (!recording) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (boardColumn.current?.contains(target)) return;
      if (form.current?.contains(target)) return;
      setRecording(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [recording]);

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
      <DialogContent
        className="sm:max-w-5xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
        // Focusing the text starts recording, so the dialog must not drop
        // focus there on open: it focuses itself and the user picks.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-normal text-base">
            {thread || justSubmitted ? t('threadTitle') : t('askTitle')}
          </DialogTitle>
          <DialogDescription>
            {moveLabel}
            {subtitle && ` · ${subtitle}`}
            {mode === 'coach'
              ? ` · ${t('playedAs', { color: colorLabel })}`
              : ` · ${t('youPlayed', { color: colorLabel })}`}
          </DialogDescription>
          {gameUrl && (
            <a
              href={gameUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ExternalLinkIcon className="size-4" />
              {t('openGame')}
            </a>
          )}
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Same sizing idea as the game modal: as large as the screen
              allows, but leave room for the recording/viewing controls. */}
          <div
            ref={boardColumn}
            className="w-full mx-auto lg:mx-0 lg:shrink-0 max-w-[max(280px,min(560px,calc(100dvh-330px)))] lg:w-[max(280px,min(560px,calc(100dvh-330px)))]"
          >
            <VariationBoard
              fen={fen}
              orientation={orientation}
              canWrite={canWrite}
              writing={
                recording && canWrite
                  ? {
                      fen: boardFen(store.state),
                      lastMove: boardLastMove(store.state),
                      drawing: currentDrawing(store.state),
                      onMove: (from, to) =>
                        editorApi.current?.move(from, to) ?? false,
                      onMark: (from, to) => {
                        store.update((s) => toggleMark(s, from, to));
                        editorApi.current?.focus();
                      },
                      onClearDrawings: () => {
                        store.update(clearDrawings);
                        editorApi.current?.focus();
                      },
                    }
                  : null
              }
              viewing={viewing}
              onStopViewing={() => view(null)}
              game={replay}
              askerColor={askerColor}
              askerNote={t(mode === 'coach' ? 'players.asker' : 'players.you')}
              boardIndex={boardIndex}
              onBoardIndexChange={setBoardIndex}
            />
          </div>

          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {thread && (
              <Message
                label={questionLabel}
                message={thread}
                fen={fen}
                id="question"
                viewingKey={viewing?.key ?? null}
                onView={view}
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
                      id={`response-${i}`}
                      viewingKey={viewing?.key ?? null}
                      onView={view}
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

            {mode === 'student' &&
              askState &&
              'success' in askState &&
              askState.telegramPrompt && <TelegramPrompt />}

            {canWrite && (
              <form
                ref={form}
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
                <input
                  type="hidden"
                  name="content"
                  value={JSON.stringify(content)}
                />
                <input type="hidden" name="body" value={plainText} />

                <span className="text-sm font-medium text-foreground">
                  {mode === 'student' ? t('bodyLabel') : tAdmin('yourResponse')}
                </span>
                <MoveEditor
                  ref={editorApi}
                  store={store}
                  label={
                    mode === 'student' ? t('bodyLabel') : tAdmin('yourResponse')
                  }
                  placeholder={
                    mode === 'student'
                      ? t('bodyPlaceholder')
                      : tAdmin('responsePlaceholder')
                  }
                  onSegmentsChange={setSegments}
                  initialDoc={draft?.doc}
                  onDocChange={(doc) => {
                    draftDoc.current = doc;
                    scheduleDraftSave();
                  }}
                  onFocus={startRecording}
                />
                <p
                  className={cn(
                    'self-end text-xs text-muted-foreground',
                    tooLong && 'text-destructive',
                  )}
                >
                  {t('charCount', {
                    count: plainText.length,
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
                      disabled={askPending || tooLong || !plainText}
                    >
                      {askPending ? t('submitting') : t('submit')}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={replyPending || tooLong || !plainText}
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
  // Names this message in `Viewing.key`.
  id: string;
  viewingKey: string | null;
  onView: (viewing: Viewing) => void;
};

function Message({ label, ...rest }: MessageProps & { label: string }) {
  return (
    <SectionLabel label={label}>
      <MessageBody {...rest} />
    </SectionLabel>
  );
}

function MessageBody({ message, fen, id, viewingKey, onView }: MessageProps) {
  const t = useTranslations('coaching.variation');
  const { content } = message;
  if (content) {
    const active = viewingKey?.startsWith(`${id}:`)
      ? Number(viewingKey.slice(id.length + 1))
      : null;
    return (
      <MessageContentView
        fen={fen}
        content={content}
        activeChip={active}
        onChipClick={(segment, index) =>
          onView({
            sans: content.lines[segment.line],
            line: segment.line,
            startPly: segment.to,
            drawings: content.drawings,
            key: `${id}:${index}`,
          })
        }
      />
    );
  }

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
            onClick={() =>
              onView({
                sans: message.variation!,
                line: null,
                startPly: 0,
                drawings: {},
                key: `${id}:old`,
              })
            }
          >
            {t('view')}
          </Button>
        </div>
      )}
    </div>
  );
}
