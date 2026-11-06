import { DEFAULT_POSITION } from 'chess.js';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';
import { playVariation } from '@/lib/chess/variation';

const HIGHLIGHT_STYLE = { backgroundColor: 'rgba(255, 213, 79, 0.5)' };

type Props = {
  // Moves from the start position; the last one is highlighted.
  moves: string[];
  showCoordinates?: boolean;
};

// A board that only shows an example.
export default function ExampleBoard({ moves, showCoordinates = false }: Props) {
  const played = playVariation(DEFAULT_POSITION, moves);
  const last = played?.moves.at(-1);
  return (
    <ChessboardWithNotation
      position={played?.positions.at(-1) ?? DEFAULT_POSITION}
      boardOrientation="white"
      showCoordinates={showCoordinates}
      squareStyles={
        last
          ? { [last.from]: HIGHLIGHT_STYLE, [last.to]: HIGHLIGHT_STYLE }
          : undefined
      }
    />
  );
}
