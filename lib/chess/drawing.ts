import type { CSSProperties } from 'react';
import type { Drawing } from '@/lib/coaching/content';

// Arrows and circles drawn on a board (spec 011) share one colour.
export const MARK_COLOR = 'rgba(21, 120, 27, 0.85)';

const RING = `radial-gradient(circle, transparent 56%, ${MARK_COLOR} 58%, ${MARK_COLOR} 68%, transparent 70%)`;

// A circle is a ring painted as a background image, so the board's own
// square colour and any last-move highlight (a background colour) still show.
export function drawingSquareStyles(
  drawing: Drawing,
): Record<string, CSSProperties> {
  return Object.fromEntries(
    drawing.circles.map((sq) => [sq, { backgroundImage: RING }]),
  );
}

export function mergeSquareStyles(
  ...styles: (Record<string, CSSProperties> | undefined)[]
): Record<string, CSSProperties> {
  const merged: Record<string, CSSProperties> = {};
  for (const set of styles) {
    for (const [sq, style] of Object.entries(set ?? {})) {
      merged[sq] = { ...merged[sq], ...style };
    }
  }
  return merged;
}
