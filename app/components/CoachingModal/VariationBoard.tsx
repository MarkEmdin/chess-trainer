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
import type { ReplayMove } from '@/lib/chess/replay';
import { playVariation } from '@/lib/chess/variation';
import { cn } from '@/lib/utils';
import GameMoveList from './GameMoveList';
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
  // The whole game around `fen` (= positions[keyIndex]), when it was saved.
  game: GameReplay | null;
  // Board position while browsing `game`; the parent owns it so the form
  // can lock away from the key position.
  boardIndex: number;
  onBoardIndexChange: (index: number) => void;
  // Away from the key position: draft controls stay visible but disabled.
  locked: boolean;
};

export type GameReplay = {
  positions: string[];
  moves: ReplayMove[];
  keyIndex: number;
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

  const { game, boardIndex } = props;
  const last = game && boardIndex > 0 ? game.moves[boardIndex - 1] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Frame>
        <ChessboardWithNotation
          position={game ? game.positions[boardIndex] : props.fen}
          boardOrientation={props.orientation}
          squareStyles={
            last
              ? { [last.from]: HIGHLIGHT_STYLE, [last.to]: HIGHLIGHT_STYLE }
              : undefined
          }
        />
      </Frame>
      {game && (
        <GameNav
          game={game}
          boardIndex={boardIndex}
          onChange={props.onBoardIndexChange}
        />
      )}
      {/* Recording sits right under the board controls: it's the main action
          at the key position, so the long move list goes last. */}
      {props.canRecord && (
        <DraftControls
          fen={props.fen}
          draft={props.draft}
          disabled={props.locked}
          onRecord={() => setRecordingAndNotify(true)}
          onRemove={() => props.onDraftChange(null)}
        />
      )}
      {game && (
        <GameMoveList
          moves={game.moves}
          keyIndex={game.keyIndex}
          boardIndex={boardIndex}
          onSelect={props.onBoardIndexChange}
        />
      )}
    </div>
  );
}

function GameNav({
  game,
  boardIndex,
  onChange,
}: {
  game: GameReplay;
  boardIndex: number;
  onChange: (index: number) => void;
}) {
  const t = useTranslations('coaching.game');
  const atKey = boardIndex === game.keyIndex;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <StepControls
        index={boardIndex}
        total={game.positions.length - 1}
        onChange={onChange}
      />
      <Button
        type="button"
        variant={atKey ? 'outline' : 'default'}
        size="sm"
        disabled={atKey}
        onClick={() => onChange(game.keyIndex)}
      >
        {t('backToKey')}
      </Button>
    </div>
  );
}

// ⏮ ◀ ▶ ⏭ plus ← → Home End. Mounted only while its board is shown, so the
// keys never drive a board that's out of view.
function StepControls({
  index,
  total,
  onChange,
}: {
  index: number;
  total: number;
  onChange: (index: number) => void;
}) {
  const tNav = useTranslations('games.modal');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // The reply textarea sits next to the board: keys typed there belong
      // to the text, not the board.
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') onChange(Math.max(0, index - 1));
      else if (e.key === 'ArrowRight') onChange(Math.min(total, index + 1));
      else if (e.key === 'Home') onChange(0);
      else if (e.key === 'End') onChange(total);
      else return;
      // Home/End would otherwise also scroll the dialog.
      e.preventDefault();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [index, total, onChange]);

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={tNav('firstMove')}
        onClick={() => onChange(0)}
        disabled={index === 0}
      >
        <ChevronFirstIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={tNav('prevMove')}
        onClick={() => onChange(Math.max(0, index - 1))}
        disabled={index === 0}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={tNav('nextMove')}
        onClick={() => onChange(Math.min(total, index + 1))}
        disabled={index === total}
      >
        <ChevronRightIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={tNav('lastMove')}
        onClick={() => onChange(total)}
        disabled={index === total}
      >
        <ChevronLastIcon />
      </Button>
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
  disabled,
  onRecord,
  onRemove,
}: {
  fen: string;
  draft: string[] | null;
  disabled: boolean;
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
        disabled={disabled}
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onRecord}
        >
          {t('edit')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onRemove}
        >
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
  // Lines are validated on save; an unplayable one shows just the start.
  const played = playVariation(fen, sans) ?? { positions: [fen], moves: [] };
  const total = played.moves.length;
  const [index, setIndex] = useState(0);

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
      <StepControls index={index} total={total} onChange={setIndex} />
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
