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
import PlayerRow from '@/app/components/PlayerRow';
import { Button } from '@/app/components/ui/button';
import { sideToMove } from '@/lib/chess/fen';
import type { PgnPlayer } from '@/lib/chess/pgnInfo';
import type { ReplayMove } from '@/lib/chess/replay';
import { formatSeconds } from '@/lib/chesscom/format';
import type { ClockSnapshot } from '@/lib/games/types';
import { playVariation } from '@/lib/chess/variation';
import { drawingSquareStyles, mergeSquareStyles } from '@/lib/chess/drawing';
import { drawKey, type Drawing } from '@/lib/coaching/content';
import { cn } from '@/lib/utils';
import { Chess, type Square } from 'chess.js';
import GameMoveList from './GameMoveList';
import VariationLine from './VariationLine';

// Same highlight as the game modal's last move; also marks the tap-tap
// source square while recording.
const HIGHLIGHT_STYLE = { backgroundColor: 'rgba(255, 213, 79, 0.5)' };

type Orientation = 'white' | 'black';

// The board while the author writes (spec 011): moves go into the text.
export type WritingBoard = {
  fen: string;
  lastMove: { from: string; to: string } | null;
  drawing: Drawing;
  onMove: (from: string, to: string) => boolean;
  onMark: (from: string, to: string) => void;
  onClearDrawings: () => void;
};

// A sent line the parent asked to show, opened at `startPly`. `line` names
// it in `drawings` (null for an old single variation, which has none).
export type ViewedLine = {
  sans: string[];
  line: string | null;
  startPly: number;
  drawings: Record<string, Drawing>;
};

type Props = {
  fen: string;
  orientation: Orientation;
  // Author side only: the student before asking, the coach before replying.
  canWrite: boolean;
  writing: WritingBoard | null;
  viewing: ViewedLine | null;
  onStopViewing: () => void;
  // The whole game around `fen` (= positions[keyIndex]), when it was saved.
  game: GameReplay | null;
  // Board position while browsing `game`; the parent owns it so the form
  // can lock away from the key position.
  boardIndex: number;
  onBoardIndexChange: (index: number) => void;
  // The student's side, marked on the player rows with `askerNote`.
  askerColor: Orientation;
  askerNote: string;
};

export type GameReplay = {
  positions: string[];
  moves: ReplayMove[];
  keyIndex: number;
  // From the PGN headers and clock comments; shown around the board.
  white?: PgnPlayer;
  black?: PgnPlayer;
  clocks?: ClockSnapshot[];
};

export default function VariationBoard(props: Props) {
  if (props.writing) {
    return <Writer orientation={props.orientation} {...props.writing} />;
  }

  if (props.viewing) {
    const { sans, line, startPly } = props.viewing;
    return (
      <Viewer
        // Re-mount per line and start so the step index starts there.
        key={`${line}:${startPly}:${sans.join(' ')}`}
        fen={props.fen}
        orientation={props.orientation}
        viewing={props.viewing}
        onBack={props.onStopViewing}
      />
    );
  }

  const { game, boardIndex } = props;
  const last = game && boardIndex > 0 ? game.moves[boardIndex - 1] : undefined;

  // Player rows only while browsing the game: a variation has no clock.
  function playerRow(color: Orientation) {
    const player = game?.[color];
    if (!game || !player) return null;
    const seconds = game.clocks?.[boardIndex]?.[`${color}Seconds`];
    return (
      <PlayerRow
        player={player}
        pieceColor={color}
        clock={seconds !== undefined ? formatSeconds(seconds) : undefined}
        isUser={color === props.askerColor}
        isActive={sideToMove(game.positions[boardIndex]) === color}
        note={color === props.askerColor ? props.askerNote : undefined}
      />
    );
  }
  const topColor = props.orientation === 'white' ? 'black' : 'white';

  return (
    <div className="flex flex-col gap-2">
      {props.canWrite && <StartHint />}
      {playerRow(topColor)}
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
      {playerRow(props.orientation)}
      {game && (
        <GameNav
          game={game}
          boardIndex={boardIndex}
          onChange={props.onBoardIndexChange}
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

// ⏮ ◀ ▶ ⏭ plus ← → Home End, and ↑ ↓ for start/end as on Lichess. Mounted only while its board is shown, so the
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
      // The text editor sits next to the board: keys typed there belong to
      // the text, not the board.
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement ||
        (e.target instanceof HTMLElement &&
          !!e.target.closest('[contenteditable="true"]'))
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') onChange(Math.max(0, index - 1));
      else if (e.key === 'ArrowRight') onChange(Math.min(total, index + 1));
      else if (e.key === 'Home' || e.key === 'ArrowUp') onChange(0);
      else if (e.key === 'End' || e.key === 'ArrowDown') onChange(total);
      else return;
      // Home/End/ArrowUp/ArrowDown would otherwise also scroll the dialog.
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

function StartHint() {
  const t = useTranslations('coaching.editor');
  return (
    <span className="text-sm text-muted-foreground">{t('startHint')}</span>
  );
}

function Writer({
  orientation,
  fen,
  lastMove,
  drawing,
  onMove,
  onMark,
  onClearDrawings,
}: WritingBoard & { orientation: Orientation }) {
  const t = useTranslations('coaching.editor');
  // Tap-tap input for touch screens: first tap picks one of the side to
  // move's pieces, second tap tries the move (or picks another own piece).
  const [selected, setSelected] = useState<string | null>(null);

  function clickSquare(square: string) {
    const chess = new Chess(fen);
    const piece = chess.get(square as Square);
    const isOwn = piece !== undefined && piece.color === chess.turn();
    if (selected && !isOwn) {
      onMove(selected, square);
      setSelected(null);
      return;
    }
    setSelected(isOwn ? square : null);
  }

  const highlights: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    highlights[lastMove.from] = HIGHLIGHT_STYLE;
    highlights[lastMove.to] = HIGHLIGHT_STYLE;
  }
  if (selected) highlights[selected] = HIGHLIGHT_STYLE;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-green-600">
        {t('recording')}
      </span>
      <Frame recording>
        <ChessboardWithNotation
          position={fen}
          boardOrientation={orientation}
          squareStyles={mergeSquareStyles(
            highlights,
            drawingSquareStyles(drawing),
          )}
          arrows={drawing.arrows}
          allowDragging
          onPieceDrop={({ sourceSquare, targetSquare }) => {
            setSelected(null);
            return targetSquare ? onMove(sourceSquare, targetSquare) : false;
          }}
          onSquareClick={({ square }) => clickSquare(square)}
          onRightDrag={onMark}
        />
      </Frame>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={drawing.arrows.length === 0 && drawing.circles.length === 0}
        onClick={onClearDrawings}
      >
        {t('clearDrawings')}
      </Button>
    </div>
  );
}

function Viewer({
  fen,
  orientation,
  viewing,
  onBack,
}: {
  fen: string;
  orientation: Orientation;
  viewing: ViewedLine;
  onBack: () => void;
}) {
  const t = useTranslations('coaching.variation');
  // Lines are validated on save; an unplayable one shows just the start.
  const played = playVariation(fen, viewing.sans) ?? {
    positions: [fen],
    moves: [],
  };
  const total = played.moves.length;
  const [index, setIndex] = useState(Math.min(viewing.startPly, total));

  const last = index > 0 ? played.moves[index - 1] : undefined;
  const drawing = viewing.drawings[drawKey(viewing.line, index)] ?? {
    arrows: [],
    circles: [],
  };

  return (
    <div className="flex flex-col gap-2">
      <Frame>
        <ChessboardWithNotation
          position={played.positions[index]}
          boardOrientation={orientation}
          squareStyles={mergeSquareStyles(
            last
              ? { [last.from]: HIGHLIGHT_STYLE, [last.to]: HIGHLIGHT_STYLE }
              : undefined,
            drawingSquareStyles(drawing),
          )}
          arrows={drawing.arrows}
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
