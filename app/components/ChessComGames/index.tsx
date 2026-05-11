'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2Icon } from 'lucide-react';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useStoredUsername } from '@/lib/chesscom/useStoredUsername';
import type { Game } from '@/lib/chesscom/types';
import { Button } from '@/app/components/ui/button';
import UsernameForm from './UsernameForm';
import GamesList from './GamesList';
import GameModal from './GameModal';

export default function ChessComGames() {
  const [username, setUsername] = useStoredUsername();
  const { games, error, isLoading, isNotFound } = useChessComGames(username);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const t = useTranslations('games');

  if (!username) {
    return <UsernameForm onSubmit={setUsername} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {games && games.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('list.showing', { username, count: games.length })}
          </p>
        ) : (
          <span />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUsername(null)}
        >
          {t('usernameForm.change')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>{t('list.loading')}</span>
        </div>
      )}

      {error && (
        <p className="text-destructive">
          {isNotFound ? t('list.errorNotFound') : t('list.errorGeneric')}
        </p>
      )}

      {games && games.length === 0 && (
        <p className="text-muted-foreground">{t('list.empty')}</p>
      )}

      {games && games.length > 0 && (
        <GamesList games={games} onSelect={setSelectedGame} />
      )}

      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}
