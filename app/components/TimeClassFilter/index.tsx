'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { TimerIcon, ZapIcon, type LucideProps } from 'lucide-react';
import {
  FILTER_TIME_CLASSES,
  type FilterTimeClass,
} from '@/lib/games/timeClassFilter';
import { cn } from '@/lib/utils';

// lucide has no bullet, so draw one in the same 24px stroke style.
function BulletIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 19l3-3m-1 4l-3-3 9.5-9.5C16 4 19 4 20 4c0 1 0 4-3.5 7.5z" />
    </svg>
  );
}

const ICONS: Record<FilterTimeClass, React.ComponentType<LucideProps>> = {
  bullet: BulletIcon,
  blitz: ZapIcon,
  rapid: TimerIcon,
};

type Props = {
  value: readonly FilterTimeClass[];
  onChange: (next: FilterTimeClass[]) => void;
};

// Multi-select chips (spec 018). The last selected chip stays on — an empty
// selection would just show an empty list.
export default function TimeClassFilter({ value, onChange }: Props) {
  const t = useTranslations('common.games');
  const tTile = useTranslations('games.tile');
  const labelId = useId();

  function toggle(tc: FilterTimeClass) {
    if (value.includes(tc)) {
      if (value.length === 1) return;
      onChange(value.filter((v) => v !== tc));
    } else {
      onChange(FILTER_TIME_CLASSES.filter((v) => v === tc || value.includes(v)));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm text-muted-foreground">
        {t('timeFilterLabel')}
      </span>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        {FILTER_TIME_CLASSES.map((tc) => {
          const on = value.includes(tc);
          const Icon = ICONS[tc];
          return (
            <button
              key={tc}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(tc)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/40',
              )}
            >
              <Icon aria-hidden className="size-4" />
              {tTile(`timeClass.${tc}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
