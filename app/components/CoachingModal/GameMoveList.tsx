'use client';

import { useEffect, useRef } from 'react';
import { formatMoveLabel, type ReplayMove } from '@/lib/chess/replay';
import { scrollDelta } from '@/lib/coaching/scrollDelta';
import { cn } from '@/lib/utils';

type Props = {
  moves: ReplayMove[];
  keyIndex: number;
  // Position index on the board (0 = start, k = after move k).
  boardIndex: number;
  onSelect: (positionIndex: number) => void;
};

// The whole game as clickable moves. The key move (★) is the one played from
// the key position — the move the question is about. At the key position it
// is the highlighted move, and clicking it goes to the board *before* it,
// where writing is allowed, instead of after it like every other move.
export default function GameMoveList({
  moves,
  keyIndex,
  boardIndex,
  onSelect,
}: Props) {
  const current = boardIndex === keyIndex ? keyIndex : boardIndex - 1;
  const currentRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLParagraphElement>(null);

  // The list scrolls inside a short box; keep the highlighted move (on open,
  // the key move) visible. Not scrollIntoView: on a phone the list is below
  // the form, and that would scroll the dialog past the board.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !currentRef.current) return;
    list.scrollTop += scrollDelta(
      currentRef.current.getBoundingClientRect(),
      list.getBoundingClientRect(),
    );
  }, [current]);

  return (
    <p
      ref={listRef}
      className="flex flex-wrap gap-x-1.5 gap-y-1 text-sm font-mono max-h-32 overflow-y-auto"
    >
      {moves.map((move, i) => {
        const isKey = i === keyIndex;
        return (
          <button
            key={i}
            ref={current === i ? currentRef : undefined}
            type="button"
            onClick={() => onSelect(isKey ? keyIndex : i + 1)}
            aria-current={current === i ? 'step' : undefined}
            className={cn(
              'rounded px-1 hover:bg-foreground/10',
              isKey && 'font-semibold',
              current === i &&
                'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {formatMoveLabel(move)}
            {isKey && ' ★'}
          </button>
        );
      })}
    </p>
  );
}
