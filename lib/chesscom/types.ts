// Raw types matching the Chess.com public API.
// See https://www.chess.com/news/view/published-data-api

import type { TimeClass } from '@/lib/games/types';

export type ChessComArchivesResponse = {
  archives: string[];
};

export type ChessComMonthResponse = {
  games: ChessComRawGame[];
};

export type ChessComResult =
  | 'win'
  | 'checkmated'
  | 'agreed'
  | 'repetition'
  | 'timeout'
  | 'resigned'
  | 'stalemate'
  | 'lose'
  | 'insufficient'
  | '50move'
  | 'abandoned'
  | 'kingofthehill'
  | 'threecheck'
  | 'timevsinsufficient'
  | 'bughousepartnerlose';

export type ChessComPlayer = {
  rating: number;
  result: ChessComResult;
  username: string;
  uuid: string;
};

export type ChessComRawGame = {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  uuid: string;
  initial_setup?: string;
  fen: string;
  time_class: TimeClass;
  rules: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
  eco?: string;
};
