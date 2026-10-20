import { Chess, type Move } from 'chess.js';

export type ReplayMove = {
  san: string;
  color: 'white' | 'black';
  fullMoveNumber: number;
  from: string;
  to: string;
};

// Replays a PGN into one FEN per position (index 0 = starting position).
// Positions come from chess.js's own before/after FENs, so games that start
// from a custom position ([SetUp]/[FEN] headers) replay correctly. Pure and
// FEN-based on purpose: a future variations feature can branch off any
// position without re-parsing the mainline.
export function buildReplay(
  pgn: string,
  fallbackFen: string,
): { positions: string[]; moves: ReplayMove[] } {
  const parser = new Chess();
  try {
    parser.loadPgn(pgn);
  } catch {
    // Unsupported PGN (e.g. Chess960 castling): show the known final
    // position rather than a misleading standard start.
    return { positions: [fallbackFen], moves: [] };
  }

  const history = parser.history({ verbose: true });
  const positions = [history[0]?.before ?? parser.fen()];
  const moves: ReplayMove[] = [];
  for (const move of history) {
    positions.push(move.after);
    moves.push(toReplayMove(move));
  }
  return { positions, moves };
}

export function toReplayMove(move: Move): ReplayMove {
  return {
    san: move.san,
    color: move.color === 'w' ? 'white' : 'black',
    fullMoveNumber: Number(move.before.split(' ')[5]),
    from: move.from,
    to: move.to,
  };
}

export function formatMoveLabel(move: ReplayMove): string {
  return move.color === 'white'
    ? `${move.fullMoveNumber}. ${move.san}`
    : `${move.fullMoveNumber}… ${move.san}`;
}
