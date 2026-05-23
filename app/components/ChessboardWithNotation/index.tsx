'use client';

import { Chessboard } from 'react-chessboard';

// react-chessboard renders rank/file labels inside the squares' corners,
// which gets unreadable on the small boards we use in cards and modals.
// This wrapper hides the built-in notation and renders ranks on the left
// edge / files on the bottom edge in a CSS grid sized to match.

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS_WHITE_VIEW = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

type Props = {
  position: string;
  boardOrientation: 'white' | 'black';
  squareStyles?: Record<string, React.CSSProperties>;
};

export default function ChessboardWithNotation({
  position,
  boardOrientation,
  squareStyles,
}: Props) {
  // Flip the label order when the board is viewed from black.
  const files = boardOrientation === 'white' ? FILES : [...FILES].reverse();
  const ranks =
    boardOrientation === 'white'
      ? RANKS_WHITE_VIEW
      : [...RANKS_WHITE_VIEW].reverse();

  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateColumns: 'auto 1fr',
        gridTemplateRows: '1fr auto',
      }}
    >
      <div className="grid grid-rows-8 text-xs text-muted-foreground">
        {ranks.map((r) => (
          <span key={r} className="flex items-center justify-end pr-1.5">
            {r}
          </span>
        ))}
      </div>
      <div>
        <Chessboard
          options={{
            position,
            boardOrientation,
            allowDragging: false,
            showNotation: false,
            showAnimations: false,
            squareStyles,
          }}
        />
      </div>
      <div />
      <div className="grid grid-cols-8 text-xs text-muted-foreground pt-1">
        {files.map((f) => (
          <span key={f} className="text-center">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
