import { formatMoveLabel, type ReplayMove } from '@/lib/chess/replay';
import type { GameColor } from '@/lib/games/types';

// A move the student can ask the coach about: the position before it, its
// 1-based half-move index and its label ("14… Nf6").
export type AskTarget = { moveIndex: number; fen: string; label: string };

// The student's own move nearest at or before the shown position (spec 038).
// Questions are always about the student's move, so the side to move in
// `fen` is the student's everywhere the thread is shown later.
export function findAskTarget(
  positions: string[],
  moves: ReplayMove[],
  index: number,
  userColor: GameColor,
): AskTarget | null {
  for (let k = Math.min(index, moves.length - 1); k >= 0; k--) {
    if (moves[k].color === userColor) {
      return {
        moveIndex: k + 1,
        fen: positions[k],
        label: formatMoveLabel(moves[k]),
      };
    }
  }
  return null;
}
