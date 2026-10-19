'use client';

import { useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useStoredUsername } from '@/lib/chesscom/useStoredUsername';
import { useLichessGames } from '@/lib/lichess/useLichessGames';
import { useStoredLichessUsername } from '@/lib/lichess/useStoredLichessUsername';
import {
  updateChesscomUsername,
  updateLichessUsername,
} from '@/lib/auth/profileActions';
import type { Game, Platform } from '@/lib/games/types';
import { Button } from '@/app/components/ui/button';
import PlatformToggle from '@/app/components/PlatformToggle';
import UsernameForm from '@/app/components/UsernameForm';

type RenderProps = {
  games: Game[];
  username: string;
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
  renderStatus: (props: RenderProps) => React.ReactNode;
  emptyMessage: string;
  children: (props: RenderProps) => React.ReactNode;
};

// Common scaffolding for any feature that consumes the user's last GAMES_LIMIT games
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
}: Props) {
  // All four branches always render — conditional hooks are illegal.
  const [storedChesscomUsername, setStoredChesscomUsername] =
    useStoredUsername();
  const [storedLichessUsername, setStoredLichessUsername] =
    useStoredLichessUsername();
  const [profileChesscomUsername, setProfileChesscomUsername] =
    useState<string | null>(initialChesscomUsername);
  const [profileLichessUsername, setProfileLichessUsername] =
    useState<string | null>(initialLichessUsername);

  const chesscomUsername = isAuthenticated
    ? profileChesscomUsername
    : storedChesscomUsername;
  const lichessUsername = isAuthenticated
    ? profileLichessUsername
    : storedLichessUsername;

  const [platform, setPlatform] = useState<Platform>('chesscom');
  // Platform whose username was just cleared via "change user". Pins the
  // form to that platform even if the other one still has a saved username.
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(
    null,
  );

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
  const { games, error, isLoading, isNotFound } =
    effectivePlatform === 'chesscom' ? chesscomResult : lichessResult;

  const tCommon = useTranslations('common.games');
  const tForm = useTranslations('games.usernameForm');

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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUsername(null)}
        >
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

      {games && !isLoading && games.length === 0 && (
        <p className="text-muted-foreground">{emptyMessage}</p>
      )}

      {games && games.length > 0 && children({ games, username })}
    </div>
  );
}
