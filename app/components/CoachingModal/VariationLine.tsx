'use client';

import type { ReplayMove } from '@/lib/chess/replay';
import { variationLabels } from '@/lib/chess/variation';
import { cn } from '@/lib/utils';

type Props = {
  moves: ReplayMove[];
  // Position index on the board (0 = start, k = after move k). Move k is
  // highlighted when `current === k`.
  current?: number;
  onSelect?: (positionIndex: number) => void;
};

export default function VariationLine({ moves, current, onSelect }: Props) {
  const labels = variationLabels(moves);
  return (
    <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-sm font-mono">
      {labels.map((label, i) =>
        onSelect ? (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i + 1)}
            aria-current={current === i + 1 ? 'step' : undefined}
            className={cn(
              'rounded px-1 hover:bg-foreground/10',
              current === i + 1 &&
                'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {label}
          </button>
        ) : (
          <span key={i}>{label}</span>
        ),
      )}
    </p>
  );
}
