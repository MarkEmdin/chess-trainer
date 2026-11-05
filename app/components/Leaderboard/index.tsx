import { TrophyIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { cupFor } from '@/lib/leaderboard/rows';
import type { Cup, LeaderboardRow } from '@/lib/leaderboard/types';

const CUP_COLOR: Record<Cup, string> = {
  gold: 'text-[#e5b93c]',
  silver: 'text-[#c3c9d1]',
  bronze: 'text-[#c98a54]',
};

function Row({ row }: { row: LeaderboardRow }) {
  const t = useTranslations('leaderboard');
  // With no likes this week everyone ties for first, and nobody earned a cup.
  const cup = row.likes > 0 ? cupFor(row.place) : null;
  return (
    <li
      aria-current={row.is_me ? 'true' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card px-3 py-2',
        row.is_me ? 'border-primary' : 'border-border',
      )}
    >
      <span className="flex w-7 shrink-0 font-semibold text-muted-foreground">
        {cup ? (
          <TrophyIcon
            aria-label={t('place', { place: row.place })}
            className={cn('size-5', CUP_COLOR[cup])}
          />
        ) : (
          row.place
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">
        {row.is_me ? t('you') : row.nickname}
      </span>
      <span className="whitespace-nowrap font-semibold text-primary">
        {t('positions', { count: row.likes })}
      </span>
    </li>
  );
}

export default function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const t = useTranslations('leaderboard');

  if (rows.length === 0) {
    return <p className="text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <ol className="flex max-w-xl flex-col gap-1.5">
      {rows.map((row) => (
        <Row key={`${row.place}-${row.nickname}`} row={row} />
      ))}
    </ol>
  );
}
