import { PlayerNotFoundError } from '@/lib/games/errors';
import type {
  ChessComArchivesResponse,
  ChessComMonthResponse,
  ChessComRawGame,
} from './types';
import { extractClockSnapshots } from '@/lib/chess/pgnInfo';
import type { Game, GameResult, GamesPage } from '@/lib/games/types';

const API_BASE = 'https://api.chess.com/pub';

// Cap how far back we look. If a user has fewer than `limit` games in the
// last year, we stop scanning rather than walking through their entire history.
const MAX_MONTH_FETCHES = 12;

const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
]);

async function fetchArchives(
  username: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/player/${encodeURIComponent(username)}/games/archives`,
    { signal },
  );
  if (res.status === 404) throw new PlayerNotFoundError(username);
  if (!res.ok)
    throw new Error(`Chess.com archives fetch failed: ${res.status}`);
  const data = (await res.json()) as ChessComArchivesResponse;
  return data.archives;
}

async function fetchMonth(
  url: string,
  signal?: AbortSignal,
): Promise<ChessComRawGame[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Chess.com month fetch failed: ${res.status}`);
  const data = (await res.json()) as ChessComMonthResponse;
  return data.games;
}

function normalizeResult(raw: string): GameResult {
  if (raw === 'win') return 'win';
  if (DRAW_RESULTS.has(raw)) return 'draw';
  return 'loss';
}

function extractOpening(ecoUrl: string | undefined): string | undefined {
  if (!ecoUrl) return undefined;
  const slug = ecoUrl.split('/').pop();
  if (!slug) return undefined;
  return decodeURIComponent(slug).replace(/-/g, ' ');
}

function normalizeGame(raw: ChessComRawGame, username: string): Game {
  const lower = username.toLowerCase();
  const userIsWhite = raw.white.username.toLowerCase() === lower;
  const userSide = userIsWhite ? raw.white : raw.black;
  const oppSide = userIsWhite ? raw.black : raw.white;
  const { snapshots, increment } = extractClockSnapshots(
    raw.pgn,
    raw.time_control,
  );
  return {
    id: raw.uuid,
    url: raw.url,
    pgn: raw.pgn,
    endTime: new Date(raw.end_time * 1000),
    timeClass: raw.time_class,
    timeControl: raw.time_control,
    increment,
    userColor: userIsWhite ? 'white' : 'black',
    user: { username: userSide.username, rating: userSide.rating },
    opponent: { username: oppSide.username, rating: oppSide.rating },
    result: normalizeResult(userSide.result),
    opening: extractOpening(raw.eco),
    finalFen: raw.fen,
    clockSnapshots: snapshots,
  };
}

// Archive URLs end in /YYYY/MM. Returned as a single comparable month index.
function archiveMonth(url: string): number {
  const [year, month] = url.split('/').slice(-2).map(Number);
  return year * 12 + (month - 1);
}

// Cursor = end_time (ms) of the oldest game already shown. A later page skips
// archive months entirely newer than the cursor, and inside the boundary month
// keeps only games strictly older than it.
export async function fetchGamesPage(
  username: string,
  cursor: number | null,
  limit: number,
  signal?: AbortSignal,
): Promise<GamesPage> {
  let archives = await fetchArchives(username, signal);
  if (cursor !== null) {
    const date = new Date(cursor);
    const cursorMonth = date.getUTCFullYear() * 12 + date.getUTCMonth();
    archives = archives.filter((url) => archiveMonth(url) <= cursorMonth);
  }

  // Archives are sorted oldest-first; monthly games inside each archive are
  // also oldest-first. Walk backward, reversing within each month, until we
  // have `limit` games or exhaust the cap.
  const collected: ChessComRawGame[] = [];
  let fetched = 0;
  for (
    let i = archives.length - 1;
    i >= 0 && collected.length < limit && fetched < MAX_MONTH_FETCHES;
    i--, fetched++
  ) {
    const monthGames = await fetchMonth(archives[i], signal);
    for (let j = monthGames.length - 1; j >= 0; j--) {
      if (cursor !== null && monthGames[j].end_time * 1000 >= cursor) continue;
      collected.push(monthGames[j]);
      if (collected.length >= limit) break;
    }
  }

  const oldest = collected[collected.length - 1];
  return {
    games: collected.map((raw) => normalizeGame(raw, username)),
    nextCursor:
      collected.length === limit && oldest ? oldest.end_time * 1000 : null,
  };
}
