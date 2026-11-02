'use client';

import { useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useStoredUsername } from '@/lib/chesscom/useStoredUsername';
import { useLichessGames } from '@/lib/lichess/useLichessGames';
import { filterByTimeClass } from '@/lib/games/timeClassFilter';
import { useStoredTimeClasses } from '@/lib/games/useStoredTimeClasses';
import { useStoredLichessUsername } from '@/lib/lichess/useStoredLichessUsername';
import {
  updateChesscomUsername,
  updateLichessUsername,
} from '@/lib/auth/profileActions';
import type { Game, Platform } from '@/lib/games/types';
import { Button } from '@/app/components/ui/button';
import PlatformToggle from '@/app/components/PlatformToggle';
import TimeClassFilter from '@/app/components/TimeClassFilter';
import UsernameForm from '@/app/components/UsernameForm';

type RenderProps = {
  games: Game[];
  username: string;
  // Load-more button or its error/retry row (null when there's nothing
  // more). Only rendered by the shell itself unless `loadMoreInChildren`.
  loadMore: React.ReactNode;
  // Bullet/blitz/rapid chips (spec 018); `games` is already filtered by
  // them. Children decide where the chips sit.
  timeFilter: React.ReactNode;
};

type Props = {
  // True when the visitor is signed in — switches storage from
  // localStorage to user_profiles columns so values live in one place and
  // follow the user across devices.
  isAuthenticated: boolean;
  // Initial usernames for signed-in users (their saved profile values).
  // Ignored for guests, who read from localStorage.
  initialChesscomUsername: string | null;
  initialLichessUsername: string | null;
  renderStatus: (
    props: Omit<RenderProps, 'loadMore' | 'timeFilter'>,
  ) => React.ReactNode;
  emptyMessage: string;
  children: (props: RenderProps) => React.ReactNode;
  // Hand the load-more controls to `children` instead of rendering them
  // under everything (Key Positions puts them under its list column).
  loadMoreInChildren?: boolean;
};

// Common scaffolding for any feature that consumes the user's recent games
// from either Chess.com or Lichess. Owns: platform selection, username
// form, loading/error/no-games branches, the "change user" button, and the
// status line. Consumers focus on what to render once games are in hand.
export default function GamesShell({
  isAuthenticated,
  initialChesscomUsername,
  initialLichessUsername,
  renderStatus,
  emptyMessage,
  children,
  loadMoreInChildren = false,
}: Props) {
  // All four branches always render — conditional hooks are illegal.
  const [storedChesscomUsername, setStoredChesscomUsername] =
    useStoredUsername();
  const [storedLichessUsername, setStoredLichessUsername] =
    useStoredLichessUsername();
  const [profileChesscomUsername, setProfileChesscomUsername] = useState<
    string | null
  >(initialChesscomUsername);
  const [profileLichessUsername, setProfileLichessUsername] = useState<
    string | null
  >(initialLichessUsername);

  const chesscomUsername = isAuthenticated
    ? profileChesscomUsername
    : storedChesscomUsername;
  const lichessUsername = isAuthenticated
    ? profileLichessUsername
    : storedLichessUsername;

  const [platform, setPlatform] = useState<Platform>('chesscom');
  // Platform whose username was just cleared via "change user". Pins the
  // form to that platform even if the other one still has a saved username.
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

  // When exactly one platform has a saved username, that one always wins —
  // no toggle, no stale state to reconcile. The toggle only matters when
  // both or neither are saved.
  const neitherSaved = !chesscomUsername && !lichessUsername;
  const onlyLichessSaved = !chesscomUsername && !!lichessUsername;
  const onlyChesscomSaved = !!chesscomUsername && !lichessUsername;
  const effectivePlatform: Platform = neitherSaved
    ? platform
    : (editingPlatform ??
      (onlyLichessSaved
        ? 'lichess'
        : onlyChesscomSaved
          ? 'chesscom'
          : platform));
  const showToggle =
    (!chesscomUsername && !lichessUsername) ||
    (!!chesscomUsername && !!lichessUsername);

  const username =
    effectivePlatform === 'chesscom' ? chesscomUsername : lichessUsername;

  const setUsername = (next: string | null) => {
    if (next === null) {
      setPlatform(effectivePlatform);
      setEditingPlatform(effectivePlatform);
    } else {
      setEditingPlatform(null);
    }
    if (effectivePlatform === 'chesscom') {
      if (isAuthenticated) {
        setProfileChesscomUsername(next);
        // Fire-and-forget DB update — failure leaves the optimistic local
        // state in place, which the next page load will reconcile.
        void updateChesscomUsername(next);
      } else {
        setStoredChesscomUsername(next);
      }
    } else {
      if (isAuthenticated) {
        setProfileLichessUsername(next);
        void updateLichessUsername(next);
      } else {
        setStoredLichessUsername(next);
      }
    }
  };

  const chesscomResult = useChessComGames(
    effectivePlatform === 'chesscom' ? username : null,
  );
  const lichessResult = useLichessGames(
    effectivePlatform === 'lichess' ? username : null,
  );
  const {
    games: allGames,
    error,
    isLoading,
    isNotFound,
    hasMore,
    isLoadingMore,
    loadMoreError,
    loadMore,
  } = effectivePlatform === 'chesscom' ? chesscomResult : lichessResult;

  const [timeClasses, setTimeClasses] = useStoredTimeClasses();
  const games = allGames && filterByTimeClass(allGames, timeClasses);
  const timeFilter = (
    <TimeClassFilter value={timeClasses} onChange={setTimeClasses} />
  );

  const tCommon = useTranslations('common.games');
  const tForm = useTranslations('games.usernameForm');
  const tLoadMore = useTranslations('games.loadMore');

  const loadMoreControls = !allGames?.length ? null : loadMoreError ? (
    <div className="flex items-center gap-3 flex-wrap">
      <p className="text-destructive">{tLoadMore('error')}</p>
      <Button variant="outline" size="sm" onClick={loadMore}>
        {tLoadMore('retry')}
      </Button>
    </div>
  ) : hasMore ? (
    <Button
      variant="outline"
      className="w-full sm:w-auto sm:self-center"
      disabled={isLoadingMore}
      onClick={loadMore}
    >
      {isLoadingMore && <Loader2Icon className="size-4 animate-spin" />}
      {tLoadMore('button')}
    </Button>
  ) : null;

  if (!username) {
    return (
      <div className="flex flex-col gap-3">
        {showToggle && (
          <PlatformToggle value={effectivePlatform} onChange={setPlatform} />
        )}
        <UsernameForm
          key={effectivePlatform}
          platform={effectivePlatform}
          onSubmit={setUsername}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showToggle && (
        <PlatformToggle value={effectivePlatform} onChange={setPlatform} />
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1">
          {games && games.length > 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">
              {renderStatus({ games, username })}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setUsername(null)}>
          {tForm('change')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>{tCommon('loading')}</span>
        </div>
      )}

      {error && !isLoading && (
        <p className="text-destructive">
          {isNotFound ? tCommon('errorNotFound') : tCommon('errorGeneric')}
        </p>
      )}

      {allGames && !isLoading && allGames.length === 0 && (
        <p className="text-muted-foreground">{emptyMessage}</p>
      )}

      {/* Games loaded, but none of the chosen time controls: keep the chips
          and load-more reachable so the user can widen or dig further. */}
      {games && allGames && allGames.length > 0 && games.length === 0 && (
        <div className="flex flex-col gap-3">
          {timeFilter}
          <p className="text-muted-foreground">{tCommon('emptyFiltered')}</p>
          {loadMoreInChildren && loadMoreControls}
        </div>
      )}

      {games &&
        games.length > 0 &&
        children({ games, username, loadMore: loadMoreControls, timeFilter })}

      {!loadMoreInChildren && loadMoreControls}
    </div>
  );
}
