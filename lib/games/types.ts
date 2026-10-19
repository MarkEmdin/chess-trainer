// Normalized game types — provider-agnostic. Chess.com and Lichess clients
// both produce this shape; UI and long-think analysis never see raw
// provider payloads.

export type Platform = 'chesscom' | 'lichess';

export type GameResult = 'win' | 'loss' | 'draw';
export type GameColor = 'white' | 'black';
export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily';

export type GamePlayer = {
  username: string;
  rating: number;
};

// Clock state after a given half-move (positions[i]). For positions where one
// side hasn't moved yet, that side's clock may still be `undefined` if the
// source didn't annotate the starting time — but normally both sides are
// filled from index 0 onward using the parsed time control.
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
