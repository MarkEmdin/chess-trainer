// Raw types matching the Chess.com public API.
// See https://www.chess.com/news/view/published-data-api

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

// Normalized types — what the UI consumes.

export type GameResult = 'win' | 'loss' | 'draw';
export type GameColor = 'white' | 'black';
export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily';

export type GamePlayer = {
  username: string;
  rating: number;
};

// Clock state after a given half-move (positions[i]). For positions where one
// side hasn't moved yet, that side's clock may still be `undefined` if the
// PGN didn't annotate the starting time — but normally both sides are filled
// from index 0 onward using the parsed time control.
export type ClockSnapshot = {
  whiteSeconds?: number;
  blackSeconds?: number;
};

export type Game = {
  id: string;
  url: string;
  pgn: string;
  endTime: Date;
  timeClass: TimeClass;
  timeControl: string;
  increment: number;
  userColor: GameColor;
  user: GamePlayer;
  opponent: GamePlayer;
  result: GameResult;
  opening?: string;
  finalFen: string;
  // One snapshot per position (length = moves + 1). Index 0 is the starting
  // position with both clocks at the initial time control.
  clockSnapshots: ClockSnapshot[];
};
