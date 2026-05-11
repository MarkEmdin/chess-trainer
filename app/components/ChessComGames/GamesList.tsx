'use client';

import type { Game } from '@/lib/chesscom/types';
import GameTile from './GameTile';

type Props = {
  games: Game[];
  onSelect: (game: Game) => void;
};

export default function GamesList({ games, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {games.map((game) => (
        <GameTile
          key={game.id}
          game={game}
          onClick={() => onSelect(game)}
        />
      ))}
    </div>
  );
}
