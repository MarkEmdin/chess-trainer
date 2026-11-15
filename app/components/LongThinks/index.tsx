'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Loader2Icon } from 'lucide-react';
import {
  collectLongThinks,
  lowerThresholdWithThinks,
  type LongThink,
} from '@/lib/games/longThinks';
import { Button } from '@/app/components/ui/button';
import type { Game } from '@/lib/games/types';
import { useStoredThreshold } from '@/lib/chesscom/useStoredThreshold';
import { useMyCoachingRequests } from '@/lib/coaching/useMyCoachingRequests';
import { threadStatus } from '@/lib/coaching/status';
import { isUnseen } from '@/lib/coaching/notifications';
import type { AskTarget } from '@/lib/coaching/askTarget';
import { rememberAsk, takePendingAsk } from '@/lib/coaching/pendingAsk';
import {
  ASKED_FILTERS,
  matchesAskedFilter,
  type AskedFilter,
} from '@/lib/coaching/askedFilter';
import GamesShell from '@/app/components/GamesShell';
import { cn } from '@/lib/utils';
import PositionRow from './PositionRow';
import PositionDetail from './PositionDetail';
import ThresholdSelector from './ThresholdSelector';
import { thinkAskTarget } from './format';

// Same chunk as /games — Turbopack/webpack dedupes, so opening the modal
// from either route pays for the chess engine just once.
const GameModal = dynamic(
  () => import('@/app/components/ChessComGames/GameModal'),
  { ssr: false },
);

// Coaching modal pulls in react-chessboard too but only mounts when a
// signed-in user clicks "Ask coach" — defer to keep it out of the
// first render budget.
const AskCoachModal = dynamic(() => import('@/app/components/AskCoachModal'), {
  ssr: false,
});

type EnrichedThink = { think: LongThink; game: Game };
type CoachingTarget = { game: Game; target: AskTarget };

const thinkKey = ({ think, game }: EnrichedThink) =>
  `${game.id}-${think.moveIndex}`;

// Brings a new user back to the position they asked about as a guest. The key
// is spent on the first list that isn't empty, found or not.
function RestorePendingAsk({
  keys,
  onRestore,
}: {
  keys: string[];
  onRestore: (key: string) => void;
}) {
  useEffect(() => {
    if (keys.length === 0) return;
    const key = takePendingAsk();
    if (key && keys.includes(key)) onRestore(key);
  }, [keys, onRestore]);
  return null;
}

// Nothing over the threshold: one tap to the highest preset that finds moves,
// or, if none does, a nudge to play a fresh rapid game (spec 036).
function NoThinks({
  threshold,
  lower,
  onLower,
}: {
  threshold: number;
  lower: number | null;
  onLower: (seconds: number) => void;
}) {
  const t = useTranslations('thinkTime');
  if (lower === null) {
    return <p className="text-muted-foreground">{t('noThinks')}</p>;
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted-foreground">{t('empty', { threshold })}</p>
      <Button variant="outline" size="sm" onClick={() => onLower(lower)}>
        {t('showLower', { seconds: lower })}
      </Button>
    </div>
  );
}

type Props = {
  isAuthenticated: boolean;
  initialChesscomUsername: string | null;
  initialLichessUsername: string | null;
};

// List of long thinks on the left, the chosen position on the right
// (spec 017). Under `lg` only the list shows; picking a row opens the
// detail full screen on top of it, so the list keeps its scroll position.
export default function LongThinks({
  isAuthenticated,
  initialChesscomUsername,
  initialLichessUsername,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gameTarget, setGameTarget] = useState<EnrichedThink | null>(null);
  const [coachingTarget, setCoachingTarget] = useState<CoachingTarget | null>(
    null,
  );
  const [threshold, setThreshold] = useStoredThreshold();
  const [askedFilter, setAskedFilter] = useState<AskedFilter>('all');
  // Only fetched when signed in (the hook handles the gating). Map is
  // keyed by fen so each row can do an O(1) "do I have a thread for
  // this position?" lookup.
  const { data: requestsByFen, mutate: refreshRequests } =
    useMyCoachingRequests(isAuthenticated);
  // `threshold` updates synchronously for the picker button (instant
  // feedback). `deferredThreshold` lags during heavy re-renders so React
  // can keep the picker responsive — we use it for the actual filtering.
  // The mismatch between the two is what `isPending` watches.
  const askedFens = useMemo(
    () => new Set(Object.keys(requestsByFen ?? {})),
    [requestsByFen],
  );
  const deferredThreshold = useDeferredValue(threshold);
  const isPending = threshold !== deferredThreshold;
  const t = useTranslations('thinkTime');

  // While the mobile full-screen detail is up, the page behind it must not
  // scroll and Escape closes it — unless a modal on top owns Escape.
  const modalOpen = !!gameTarget || !!coachingTarget;
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.classList.add('max-lg:overflow-hidden');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalOpen) setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('max-lg:overflow-hidden');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, modalOpen]);

  const selectRow = useCallback((think: LongThink, game: Game) => {
    setSelectedKey(thinkKey({ think, game }));
    setMobileOpen(true);
  }, []);

  const restoreAsk = useCallback((key: string) => {
    setSelectedKey(key);
    setMobileOpen(true);
  }, []);

  return (
    <>
      <GamesShell
        isAuthenticated={isAuthenticated}
        initialChesscomUsername={initialChesscomUsername}
        initialLichessUsername={initialLichessUsername}
        renderStatus={({ games }) =>
          t('showing', {
            count: collectLongThinks(games, deferredThreshold).length,
            gameCount: games.length,
          })
        }
        loadMoreInChildren
      >
        {({ games, loadMore, timeFilter, filterNotice }) => {
          const enriched = collectLongThinks(games, deferredThreshold).map(
            (item) => {
              const thread = requestsByFen?.[item.think.fenBefore];
              return {
                ...item,
                thread,
                status: threadStatus(thread),
                hasNewAnswer: !!thread && isUnseen(thread),
              };
            },
          );
          const shown = enriched.filter((item) =>
            matchesAskedFilter(item.status, askedFilter),
          );
          // A selection the filter or threshold has hidden falls back to
          // the first visible row.
          const selectedIndex = Math.max(
            0,
            shown.findIndex((item) => thinkKey(item) === selectedKey),
          );
          const selected = shown[selectedIndex];

          return (
            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              {isAuthenticated && (
                <RestorePendingAsk
                  keys={shown.map(thinkKey)}
                  onRestore={restoreAsk}
                />
              )}
              <div className="flex flex-col gap-3">
                <ThresholdSelector value={threshold} onChange={setThreshold} />
                {timeFilter}
                {isAuthenticated && enriched.length > 0 && (
                  <div
                    role="tablist"
                    className="flex gap-1 rounded-[9px] border border-border bg-card p-[3px]"
                  >
                    {ASKED_FILTERS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={askedFilter === key}
                        onClick={() => setAskedFilter(key)}
                        className={cn(
                          'flex-1 rounded-[7px] px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          askedFilter === key
                            ? 'bg-secondary font-semibold text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t(`askedFilter.${key}`, {
                          count: enriched.filter((item) =>
                            matchesAskedFilter(item.status, key),
                          ).length,
                        })}
                      </button>
                    ))}
                  </div>
                )}
                {isPending ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2Icon aria-hidden className="size-6 animate-spin" />
                  </div>
                ) : enriched.length === 0 ? (
                  (filterNotice ?? (
                    <NoThinks
                      threshold={deferredThreshold}
                      lower={lowerThresholdWithThinks(games, deferredThreshold)}
                      onLower={setThreshold}
                    />
                  ))
                ) : shown.length === 0 ? (
                  <p className="text-muted-foreground">
                    {t(
                      askedFilter === 'unasked' ? 'emptyUnasked' : 'emptyAsked',
                    )}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {shown.map((item) => (
                      <li key={thinkKey(item)}>
                        <PositionRow
                          think={item.think}
                          game={item.game}
                          status={item.status}
                          hasNewAnswer={item.hasNewAnswer}
                          selected={item === selected}
                          onSelect={selectRow}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {loadMore}
              </div>

              {selected && !isPending && (
                <div
                  data-mobile-open={String(mobileOpen)}
                  className={cn(
                    'hidden lg:block lg:sticky lg:top-6 lg:self-start',
                    mobileOpen &&
                      'fixed inset-0 z-50 block overflow-y-auto bg-background p-4 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0',
                  )}
                >
                  <PositionDetail
                    think={selected.think}
                    game={selected.game}
                    thread={selected.thread}
                    isAuthenticated={isAuthenticated}
                    onAskCoach={() =>
                      isAuthenticated
                        ? setCoachingTarget({
                            game: selected.game,
                            target: thinkAskTarget(selected.think),
                          })
                        : rememberAsk(thinkKey(selected))
                    }
                    onOpenGame={() => setGameTarget(selected)}
                    onBack={() => setMobileOpen(false)}
                    counter={{ n: selectedIndex + 1, total: shown.length }}
                  />
                </div>
              )}
            </div>
          );
        }}
      </GamesShell>

      {gameTarget && (
        <GameModal
          game={gameTarget.game}
          initialIndex={gameTarget.think.moveIndex - 1}
          onClose={() => setGameTarget(null)}
          onAsk={(target) => {
            setGameTarget(null);
            setCoachingTarget({ game: gameTarget.game, target });
          }}
          askedFens={askedFens}
          isAuthenticated={isAuthenticated}
        />
      )}

      {coachingTarget && (
        <AskCoachModal
          game={coachingTarget.game}
          target={coachingTarget.target}
          thread={requestsByFen?.[coachingTarget.target.fen]}
          onClose={() => setCoachingTarget(null)}
          onSubmitted={refreshRequests}
          onSeen={refreshRequests}
        />
      )}
    </>
  );
}
