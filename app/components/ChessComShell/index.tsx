'use client';

import { Loader2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useStoredUsername } from '@/lib/chesscom/useStoredUsername';
import type { Game } from '@/lib/chesscom/types';
import { Button } from '@/app/components/ui/button';
import ChessComUsernameForm from '@/app/components/ChessComUsernameForm';

type RenderProps = {
  games: Game[];
  username: string;
};

type Props = {
  // Status text rendered to the left of the change-user button. Only called
  // when games loaded successfully and the list is non-empty.
  renderStatus: (props: RenderProps) => React.ReactNode;
  // Message shown when fetch succeeded but the player has zero games on
  // Chess.com. Different from feature-specific empties — those go inside
  // `children` (e.g. "no long thinks but games exist").
  emptyMessage: string;
  // Main feature content. Called only when games loaded and non-empty.
  children: (props: RenderProps) => React.ReactNode;
};

// Common scaffolding for any feature that consumes the user's last 10
// Chess.com games. Owns: username form, loading / error / no-games branches,
// the "change user" button, and the status line. Consumers focus on what to
// render once games are in hand.
export default function ChessComShell({
  renderStatus,
  emptyMessage,
  children,
}: Props) {
  const [username, setUsername] = useStoredUsername();
  const { games, error, isLoading, isNotFound } = useChessComGames(username);
  const tCommon = useTranslations('common.chesscom');
  const tForm = useTranslations('games.usernameForm');

  if (!username) {
    return <ChessComUsernameForm onSubmit={setUsername} />;
  }

  return (
    <div className="flex flex-col gap-6">
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
