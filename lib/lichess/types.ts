// Raw types matching Lichess's public "export games of a user" API.
// See https://lichess.org/api#tag/Games/operation/apiGamesUser
//
// Live-verified against a real response (curl against
// /api/games/user/EmdinMark?max=3&clocks=true&opening=true&pgnInJson=true)
// on 2026-10-19. The real payload includes additional fields we don't use
// (variant, perf, source, ratingDiff, provisional, flair, moves) — this type
// only declares what the normalizer reads.

export type LichessSpeed =
  | 'ultraBullet'
  | 'bullet'
  | 'blitz'
  | 'rapid'
  | 'classical'
  | 'correspondence';

export type LichessPlayer = {
  user?: { name: string; id: string };
  rating: number;
};

export type LichessGame = {
  id: string;
  rated: boolean;
  speed: LichessSpeed;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: LichessPlayer;
    black: LichessPlayer;
  };
  winner?: 'white' | 'black';
  opening?: { eco: string; name: string; ply: number };
  pgn?: string;
  clock?: { initial: number; increment: number; totalTime: number };
  // Centiseconds remaining after each ply, when `clocks=true` was requested.
  clocks?: number[];
};
