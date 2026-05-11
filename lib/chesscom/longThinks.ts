import { Chess } from 'chess.js';
import type { Game, GameColor } from './types';

export type LongThink = {
  gameId: string;
  // Half-move index (1-based): 1 = white's first move, 2 = black's first move, ...
  moveIndex: number;
  // Full move number for display: 1 for moves 1-2, 2 for moves 3-4, etc.
  fullMoveNumber: number;
  // SAN notation of the move that was made after the long think (e.g. "Nf3").
  san: string;
  color: GameColor;
  // Position the player was looking at while thinking — i.e. *before* the move.
  fenBefore: string;
  // Thinking time in seconds.
  seconds: number;
  // Squares of the opponent's previous move (the move that led to `fenBefore`).
  // Undefined when the long think is the user's very first move of the game.
  lastOpponentMove?: { from: string; to: string };
};

// Find every move where the player spent at least `thresholdSec` thinking.
// Uses the same `(prev + increment) − current` formula as the GameModal's
// per-move delta, so increment-style time controls don't mis-attribute the
// auto-gain as thinking.
export function findLongThinks(game: Game, thresholdSec: number): LongThink[] {
  if (game.clockSnapshots.length < 2) return [];

  const parser = new Chess();
  try {
    parser.loadPgn(game.pgn);
  } catch {
    return [];
  }
  const history = parser.history({ verbose: true });

  const result: LongThink[] = [];
  const replay = new Chess();

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const halfMoveIndex = i + 1; // index into clockSnapshots after this move
    const moverIsWhite = halfMoveIndex % 2 === 1;
    const moverColor: GameColor = moverIsWhite ? 'white' : 'black';

    // Only the user's thinks are interesting on this page — opponent's
    // hesitation is informative too but conceptually a different feature.
    if (moverColor === game.userColor) {
      const prev = game.clockSnapshots[Math.max(0, halfMoveIndex - 2)];
      const curr = game.clockSnapshots[halfMoveIndex];
      const prevSec = moverIsWhite ? prev?.whiteSeconds : prev?.blackSeconds;
      const currSec = moverIsWhite ? curr?.whiteSeconds : curr?.blackSeconds;

      if (prevSec !== undefined && currSec !== undefined) {
        const spent = prevSec + game.increment - currSec;
        if (spent >= thresholdSec) {
          const prevMove = i > 0 ? history[i - 1] : undefined;
          result.push({
            gameId: game.id,
            moveIndex: halfMoveIndex,
            fullMoveNumber: Math.ceil(halfMoveIndex / 2),
            san: move.san,
            color: moverColor,
            fenBefore: replay.fen(),
            seconds: spent,
            lastOpponentMove: prevMove
              ? { from: prevMove.from, to: prevMove.to }
              : undefined,
          });
        }
      }
    }

    replay.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
  }

  return result;
}
