'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { DEFAULT_POSITION } from 'chess.js';
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import ExampleBoard from '@/app/components/ExampleBoard';
import { Button } from '@/app/components/ui/button';
import { formatMoveLabel } from '@/lib/chess/replay';
import { playVariation } from '@/lib/chess/variation';
import { CHIP_CLASS } from '@/lib/coaching/chipClass';
import { chipLabel } from '@/lib/coaching/content';
import { cn } from '@/lib/utils';

type Props = {
  // Moves from the start position.
  line: string[];
  // How many of them the board shows at first.
  start: number;
  chips: { from: number; to: number }[];
  // The sample text: a string, or the index of a chip.
  text: (string | number)[];
  hint: string;
  showCoordinates?: boolean;
  // Shown above and below the text.
  header?: ReactNode;
  footer?: ReactNode;
};

// A sample message on /about whose chips and board work like the real ones: a
// chip opens at its first move, and the arrows step through the line, on screen
// or on the keyboard. A page can hold several demos, so the keys go to the one
// holding focus.
export default function LineDemo({
  line,
  start,
  chips,
  text,
  hint,
  showCoordinates,
  header,
  footer,
}: Props) {
  const t = useTranslations('games.modal');
  const [ply, setPly] = useState(start);
  const root = useRef<HTMLDivElement>(null);
  const current = playVariation(DEFAULT_POSITION, line)?.moves[ply - 1];
  const prev = Math.max(start, ply - 1);
  const next = Math.min(line.length, ply + 1);
  const steps = [
    { label: t('firstMove'), icon: <ChevronFirstIcon />, to: start },
    { label: t('prevMove'), icon: <ChevronLeftIcon />, to: prev },
    { label: t('nextMove'), icon: <ChevronRightIcon />, to: next },
    { label: t('lastMove'), icon: <ChevronLastIcon />, to: line.length },
  ];

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') setPly(prev);
    else if (e.key === 'ArrowRight') setPly(next);
  }

  // A button disabled by its own click drops focus, which would end the keys.
  function step(to: number) {
    setPly(to);
    root.current?.focus({ preventScroll: true });
  }

  return (
    <div
      ref={root}
      data-testid="line-demo"
      tabIndex={-1}
      className="flex flex-col gap-3 outline-none"
      onKeyDown={onKeyDown}
    >
      <ExampleBoard
        moves={line.slice(0, ply)}
        showCoordinates={showCoordinates}
      />
      <div className="flex items-center justify-center gap-1">
        {steps.map(({ label, icon, to }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            disabled={to === ply}
            onClick={() => step(to)}
          >
            {icon}
          </Button>
        ))}
        <span
          aria-live="polite"
          className="min-w-20 text-center font-mono text-sm text-foreground"
        >
          {current && formatMoveLabel(current)}
        </span>
      </div>
      {header}
      <p className="text-sm leading-7 text-foreground">
        {text.map((part, i) => {
          if (typeof part === 'string') return <span key={i}>{part}</span>;
          const { from, to } = chips[part];
          const active = ply > from && ply <= to;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={active}
              className={cn(CHIP_CLASS, active && 'ring-2 ring-primary')}
              onClick={() => setPly(from + 1)}
            >
              {chipLabel(DEFAULT_POSITION, line, from, to)}
            </button>
          );
        })}
      </p>
      {footer}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
