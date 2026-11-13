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

// With no likes everyone ties for first, and nobody earned a cup.
function cupOf(row: LeaderboardRow): Cup | null {
  return row.likes > 0 ? cupFor(row.place) : null;
}

function PodiumCard({ row, cup }: { row: LeaderboardRow; cup: Cup }) {
  const t = useTranslations('leaderboard');
  return (
    <li
      aria-current={row.is_me ? 'true' : undefined}
      className={cn(
        'flex min-w-0 flex-col items-center gap-1 rounded-lg border bg-card px-2 py-3 text-center',
        row.is_me ? 'border-primary' : 'border-border',
      )}
    >
      <TrophyIcon
        aria-label={t('place', { place: row.place })}
        className={cn('size-7', CUP_COLOR[cup])}
      />
      <span className="w-full truncate font-medium text-foreground">
        {row.is_me ? t('you') : row.nickname}
      </span>
      <span className="text-sm font-semibold text-primary">
        {t('positions', { count: row.likes })}
      </span>
    </li>
  );
}

function Row({ row }: { row: LeaderboardRow }) {
  const t = useTranslations('leaderboard');
  return (
    <li
      aria-current={row.is_me ? 'true' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card px-3 py-2',
        row.is_me ? 'border-primary' : 'border-border',
      )}
    >
      <span className="flex w-7 shrink-0 font-semibold text-muted-foreground">
        {row.place}
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

  const podium = rows.flatMap((row) => {
    const cup = cupOf(row);
    return cup ? [{ row, cup }] : [];
  });
  const rest = rows.filter((row) => !cupOf(row));
  const key = (row: LeaderboardRow) => `${row.place}-${row.nickname}`;

  return (
    <div className="flex max-w-xl flex-col gap-3">
      {podium.length > 0 && (
        <ol aria-label={t('podium')} className="grid grid-cols-3 gap-2">
          {podium.map(({ row, cup }) => (
            <PodiumCard key={key(row)} row={row} cup={cup} />
          ))}
        </ol>
      )}
      {rest.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {rest.map((row) => (
            <Row key={key(row)} row={row} />
          ))}
        </ol>
      )}
      <p className="text-sm text-muted-foreground">{t('hint')}</p>
    </div>
  );
}
