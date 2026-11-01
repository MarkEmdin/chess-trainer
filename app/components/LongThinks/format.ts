import type { LongThink } from '@/lib/games/longThinks';

// Soft yellow — classic chess "last move" highlight (matches Lichess/Chess.com
// conventions and stays readable on the board's own colours).
const LAST_MOVE_HIGHLIGHT = 'rgba(247, 230, 88, 0.55)';

// White moves render as "12. Nf3"; black as "12… Nf6".
export function formatThinkMove(think: LongThink): string {
  return think.color === 'white'
    ? `${think.fullMoveNumber}. ${think.san}`
    : `${think.fullMoveNumber}… ${think.san}`;
}

// Highlights the opponent's move the player was answering.
export function lastMoveStyles(
  think: LongThink,
): Record<string, React.CSSProperties> {
  const move = think.lastOpponentMove;
  if (!move) return {};
  return {
    [move.from]: { backgroundColor: LAST_MOVE_HIGHLIGHT },
    [move.to]: { backgroundColor: LAST_MOVE_HIGHLIGHT },
  };
}
