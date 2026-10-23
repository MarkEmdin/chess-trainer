import { formatBadgeCount } from '@/lib/coaching/notifications';
import { cn } from '@/lib/utils';

type Props = {
  count: number;
  tone: 'red' | 'green';
  // Pinned to the bell's corner, or inline in a menu row.
  inline?: boolean;
};

// The number on the bell; hidden at zero. Decorative: the bell's label
// spells the counts out.
export default function BadgePill({ count, tone, inline = false }: Props) {
  const text = formatBadgeCount(count);
  if (!text) return null;
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none text-white ring-2 ring-card',
        tone === 'red' ? 'bg-destructive' : 'bg-green-600',
        !inline && 'absolute -top-1.5',
        !inline && (tone === 'red' ? '-right-1.5' : '-left-1.5'),
      )}
    >
      {text}
    </span>
  );
}
