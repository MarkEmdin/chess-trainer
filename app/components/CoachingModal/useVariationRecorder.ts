'use client';

import { useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { MAX_VARIATION_MOVES, playVariation } from '@/lib/chess/variation';

// Recording state for one variation. The SAN list is the only state; the
// current position and last move are derived from it, so undo/clear can't
// drift out of sync with the board.
export function useVariationRecorder(startFen: string, initial?: string[]) {
  const [moves, setMoves] = useState<string[]>(initial ?? []);
  const [selected, setSelected] = useState<string | null>(null);

  const played = playVariation(startFen, moves);
  const fen = played?.positions.at(-1) ?? startFen;
  const last = played?.moves.at(-1);
  const lastMove = last ? { from: last.from, to: last.to } : null;

  function tryMove(from: string, to: string): boolean {
    if (moves.length >= MAX_VARIATION_MOVES) return false;
    try {
      // Always promote to a queen: no picker UI (spec 005).
      const move = new Chess(fen).move({ from, to, promotion: 'q' });
      setMoves([...moves, move.san]);
      setSelected(null);
      return true;
    } catch {
      return false;
    }
  }

  // Tap-tap input for touch screens: first tap picks one of the side to
  // move's pieces, second tap tries the move (or picks another own piece).
  function clickSquare(square: string) {
    const chess = new Chess(fen);
    const piece = chess.get(square as Square);
    const isOwn = piece !== undefined && piece.color === chess.turn();
    if (selected && !isOwn) {
      if (!tryMove(selected, square)) setSelected(null);
      return;
    }
    setSelected(isOwn ? square : null);
  }

  return {
    moves,
    fen,
    lastMove,
    selected,
    tryMove,
    clickSquare,
    undo: () => {
      setMoves(moves.slice(0, -1));
      setSelected(null);
    },
    clear: () => {
      setMoves([]);
      setSelected(null);
    },
  };
}
