'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';
import { Button } from '@/app/components/ui/button';
import { playVariation } from '@/lib/chess/variation';
import { cn } from '@/lib/utils';
import VariationLine from './VariationLine';
import { useVariationRecorder } from './useVariationRecorder';

// Same highlight as the game modal's last move; also marks the tap-tap
// source square while recording.
const HIGHLIGHT_STYLE = { backgroundColor: 'rgba(255, 213, 79, 0.5)' };

type Orientation = 'white' | 'black';

type Props = {
  fen: string;
  orientation: Orientation;
  // Author side only: the student before asking, the coach before replying.
  canRecord: boolean;
  draft: string[] | null;
  onDraftChange: (next: string[] | null) => void;
  // A sent variation the parent asked to show; null = show `fen`.
  viewing: string[] | null;
  onStopViewing: () => void;
  onRecordingChange: (recording: boolean) => void;
};

export default function VariationBoard(props: Props) {
  const [recording, setRecording] = useState(false);

  function setRecordingAndNotify(next: boolean) {
    setRecording(next);
    props.onRecordingChange(next);
  }

  if (recording) {
    return (
      <Recorder
        fen={props.fen}
        orientation={props.orientation}
        initial={props.draft ?? undefined}
        onDone={(moves) => {
          props.onDraftChange(moves.length > 0 ? moves : null);
          setRecordingAndNotify(false);
        }}
      />
    );
  }

  if (props.viewing) {
    return (
      <Viewer
        // Re-mount per variation so the step index starts at 0.
        key={props.viewing.join(' ')}
        fen={props.fen}
        orientation={props.orientation}
        sans={props.viewing}
        onBack={props.onStopViewing}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Frame>
        <ChessboardWithNotation
          position={props.fen}
          boardOrientation={props.orientation}
        />
      </Frame>
      {props.canRecord && (
        <DraftControls
          fen={props.fen}
          draft={props.draft}
          onRecord={() => setRecordingAndNotify(true)}
          onRemove={() => props.onDraftChange(null)}
        />
      )}
    </div>
  );
}

function Frame({
  recording = false,
  children,
}: {
  recording?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="variation-board-frame"
      className={cn(
        'rounded-md p-1 transition-shadow',
        recording &&
          'ring-2 ring-green-600 shadow-[0_0_16px] shadow-green-600/50',
      )}
    >
      {children}
    </div>
  );
}

function DraftControls({
  fen,
  draft,
  onRecord,
  onRemove,
}: {
  fen: string;
  draft: string[] | null;
  onRecord: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations('coaching.variation');
  const played = draft ? playVariation(fen, draft) : null;

  if (!played) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={onRecord}
      >
        {t('record')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{t('attached')}</span>
      <VariationLine moves={played.moves} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onRecord}>
          {t('edit')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          {t('remove')}
        </Button>
      </div>
    </div>
  );
}

function Recorder({
  fen,
  orientation,
  initial,
  onDone,
}: {
  fen: string;
  orientation: Orientation;
  initial: string[] | undefined;
  onDone: (moves: string[]) => void;
}) {
  const t = useTranslations('coaching.variation');
  const recorder = useVariationRecorder(fen, initial);
  const played = playVariation(fen, recorder.moves);

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (recorder.lastMove) {
    squareStyles[recorder.lastMove.from] = HIGHLIGHT_STYLE;
    squareStyles[recorder.lastMove.to] = HIGHLIGHT_STYLE;
  }
  if (recorder.selected) squareStyles[recorder.selected] = HIGHLIGHT_STYLE;

  return (
    <div className="flex flex-col gap-2">
      <Frame recording>
        <ChessboardWithNotation
          position={recorder.fen}
          boardOrientation={orientation}
          squareStyles={squareStyles}
          allowDragging
          onPieceDrop={({ sourceSquare, targetSquare }) =>
            targetSquare ? recorder.tryMove(sourceSquare, targetSquare) : false
          }
          onSquareClick={({ square }) => recorder.clickSquare(square)}
        />
      </Frame>
      <span className="text-sm font-medium text-green-600">
        {t('recording')}
      </span>
      {played && played.moves.length > 0 && (
        <VariationLine moves={played.moves} />
      )}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={recorder.undo}
          disabled={recorder.moves.length === 0}
        >
          {t('undo')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={recorder.clear}
          disabled={recorder.moves.length === 0}
        >
          {t('clear')}
        </Button>
        <Button type="button" size="sm" onClick={() => onDone(recorder.moves)}>
          {t('done')}
        </Button>
      </div>
    </div>
  );
}

function Viewer({
  fen,
  orientation,
  sans,
  onBack,
}: {
  fen: string;
  orientation: Orientation;
  sans: string[];
  onBack: () => void;
}) {
  const t = useTranslations('coaching.variation');
  const tNav = useTranslations('games.modal');
  // Lines are validated on save; an unplayable one shows just the start.
  const played = playVariation(fen, sans) ?? { positions: [fen], moves: [] };
  const total = played.moves.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(total, i + 1));
      else if (e.key === 'Home') setIndex(0);
      else if (e.key === 'End') setIndex(total);
      else return;
      // Home/End would otherwise also scroll the dialog.
      e.preventDefault();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [total]);

  const last = index > 0 ? played.moves[index - 1] : undefined;
  const squareStyles = last
    ? { [last.from]: HIGHLIGHT_STYLE, [last.to]: HIGHLIGHT_STYLE }
    : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Frame>
        <ChessboardWithNotation
          position={played.positions[index]}
          boardOrientation={orientation}
          squareStyles={squareStyles}
        />
      </Frame>
      <div className="flex items-center justify-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={tNav('firstMove')}
          onClick={() => setIndex(0)}
          disabled={index === 0}
        >
          <ChevronFirstIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={tNav('prevMove')}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={tNav('nextMove')}
          onClick={() => setIndex((i) => Math.min(total, i + 1))}
          disabled={index === total}
        >
          <ChevronRightIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={tNav('lastMove')}
          onClick={() => setIndex(total)}
          disabled={index === total}
        >
          <ChevronLastIcon />
        </Button>
      </div>
      <VariationLine moves={played.moves} current={index} onSelect={setIndex} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={onBack}
      >
        {t('backToPosition')}
      </Button>
    </div>
  );
}
