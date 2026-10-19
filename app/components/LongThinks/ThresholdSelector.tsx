'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const PRESETS = [15, 30, 45, 60, 90] as const;

type Props = {
  value: number;
  onChange: (next: number) => void;
};

// One connected segmented control — fits a single row even at 320px, unlike
// five separate buttons that wrap.
export default function ThresholdSelector({ value, onChange }: Props) {
  const t = useTranslations('thinkTime');
  const labelId = useId();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span id={labelId} className="text-sm text-muted-foreground">
        {t('thresholdLabel')}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="inline-flex w-full sm:w-auto rounded-md border border-border overflow-hidden divide-x divide-border"
      >
        {PRESETS.map((seconds) => {
          const selected = value === seconds;
          return (
            <button
              key={seconds}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(seconds)}
              className={cn(
                'flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted',
              )}
            >
              {t('secondsShort', { value: seconds })}
            </button>
          );
        })}
      </div>
    </div>
  );
}
