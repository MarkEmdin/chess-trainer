import { Chess } from 'chess.js';
import {
  formatMoveLabel,
  toReplayMove,
  type ReplayMove,
} from '@/lib/chess/replay';

export const MAX_VARIATION_MOVES = 40;

// Plays a SAN line from a FEN. Returns null as soon as a move is illegal, so
// the same check guards both the recorder and the server actions.
export function playVariation(
  fen: string,
  sans: string[],
): { positions: string[]; moves: ReplayMove[] } | null {
  const chess = new Chess(fen);
  const positions = [chess.fen()];
  const moves: ReplayMove[] = [];
  for (const san of sans) {
    try {
      const move = chess.move(san);
      positions.push(move.after);
      moves.push(toReplayMove(move));
    } catch {
      return null;
    }
  }
  return { positions, moves };
}

// "3… Nf6 4. Nc3 Bc5": a black move only carries its number when it opens
// the line.
export function formatVariation(moves: ReplayMove[]): string {
  return moves
    .map((move, i) =>
      i === 0 || move.color === 'white' ? formatMoveLabel(move) : move.san,
    )
    .join(' ');
}

// Shape check for the `variation` form field (a JSON array of SAN strings).
// Legality is the caller's job: it needs the position's FEN.
export function parseVariationField(
  raw: FormDataEntryValue | null,
): string[] | null | 'invalid' {
  if (raw === null || raw === '') return null;
  if (typeof raw !== 'string') return 'invalid';
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return 'invalid';
  }
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_VARIATION_MOVES ||
    !value.every((san) => typeof san === 'string')
  ) {
    return 'invalid';
  }
  return value;
}
