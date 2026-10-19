import { Chess } from 'chess.js';
import { PlayerNotFoundError } from '@/lib/games/errors';
import type {
  ClockSnapshot,
  Game,
  GameResult,
  GamesPage,
  TimeClass,
} from '@/lib/games/types';
import type { LichessGame, LichessSpeed } from './types';

const API_BASE = 'https://lichess.org/api';

const SPEED_TO_TIME_CLASS: Record<LichessSpeed, TimeClass> = {
  ultraBullet: 'bullet',
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rapid',
  classical: 'rapid',
  correspondence: 'daily',
};

async function fetchGamesNdjson(
  username: string,
  cursor: number | null,
  limit: number,
  signal?: AbortSignal,
): Promise<string> {
  const until = cursor === null ? '' : `&until=${cursor}`;
  const url = `${API_BASE}/games/user/${encodeURIComponent(username)}?max=${limit}${until}&clocks=true&opening=true&pgnInJson=true`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/x-ndjson' },
  });
  if (res.status === 404) throw new PlayerNotFoundError(username);
  if (!res.ok) throw new Error(`Lichess games fetch failed: ${res.status}`);
  return res.text();
}

function parseNdjson(text: string): LichessGame[] {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LichessGame);
}

function normalizeResult(
  winner: 'white' | 'black' | undefined,
  userColor: 'white' | 'black',
): GameResult {
  if (winner === undefined) return 'draw';
  return winner === userColor ? 'win' : 'loss';
}

// Lichess's `clocks` array is centiseconds remaining after each ply. Index 0
// of our snapshot list is the pre-game state (both sides at `initial`); each
// subsequent `clocks[i]` updates whichever side just moved, carrying the
// other side forward — same shape as Chess.com's PGN-comment-derived
// snapshots in lib/chesscom/api.ts.
function extractClockSnapshots(
  clocksCentiseconds: number[] | undefined,
  initialSeconds: number,
): ClockSnapshot[] {
  const snapshots: ClockSnapshot[] = [
    { whiteSeconds: initialSeconds, blackSeconds: initialSeconds },
  ];
  if (!clocksCentiseconds) return snapshots;

  let currentWhite = initialSeconds;
  let currentBlack = initialSeconds;
  for (let i = 0; i < clocksCentiseconds.length; i++) {
    const seconds = clocksCentiseconds[i] / 100;
    if (i % 2 === 0) currentWhite = seconds;
    else currentBlack = seconds;
    snapshots.push({ whiteSeconds: currentWhite, blackSeconds: currentBlack });
  }
  return snapshots;
}

// Lichess doesn't return the final FEN directly — derive it by replaying the
// PGN. `finalFen` is read by GameModal as the fallback position.
function finalFenFromPgn(pgn: string): string {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return '';
  }
  return chess.fen();
}

function normalizeGame(raw: LichessGame, username: string): Game {
  const lower = username.toLowerCase();
  const whiteName = raw.players.white.user?.name ?? '';
  const userIsWhite = whiteName.toLowerCase() === lower;
  const userSide = userIsWhite ? raw.players.white : raw.players.black;
  const oppSide = userIsWhite ? raw.players.black : raw.players.white;
  const userColor = userIsWhite ? 'white' : 'black';
  const pgn = raw.pgn ?? '';
  const initial = raw.clock?.initial ?? 0;
  const increment = raw.clock?.increment ?? 0;

  return {
    id: raw.id,
    url: `https://lichess.org/${raw.id}`,
    pgn,
    endTime: new Date(raw.lastMoveAt),
    timeClass: SPEED_TO_TIME_CLASS[raw.speed] ?? 'blitz',
    // Not displayed anywhere in the UI — only Chess.com's own parser reads
    // this format. Synthesized purely to satisfy the shared type.
    timeControl: `${initial}+${increment}`,
    increment,
    userColor,
    user: { username: userSide.user?.name ?? username, rating: userSide.rating },
    opponent: { username: oppSide.user?.name ?? '?', rating: oppSide.rating },
    result: normalizeResult(raw.winner, userColor),
    opening: raw.opening?.name,
    finalFen: pgn ? finalFenFromPgn(pgn) : '',
    clockSnapshots: extractClockSnapshots(raw.clocks, initial),
  };
}

// Lichess's `until` filters by createdAt and may be inclusive, so the next
// cursor sits 1 ms before the oldest game to keep it from repeating.
export async function fetchGamesPage(
  username: string,
  cursor: number | null,
  limit: number,
  signal?: AbortSignal,
): Promise<GamesPage> {
  const text = await fetchGamesNdjson(username, cursor, limit, signal);
  const rawGames = parseNdjson(text);
  const oldest = rawGames[rawGames.length - 1];
  return {
    games: rawGames.map((raw) => normalizeGame(raw, username)),
    nextCursor:
      rawGames.length === limit && oldest ? oldest.createdAt - 1 : null,
  };
}
