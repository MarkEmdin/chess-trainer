import { PlayerNotFoundError } from './errors';
import type {
  ChessComArchivesResponse,
  ChessComMonthResponse,
  ChessComRawGame,
  ClockSnapshot,
  Game,
  GameResult,
} from './types';

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
  if (!res.ok) throw new Error(`Chess.com archives fetch failed: ${res.status}`);
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

// "0:02:59.9" → 179.9 seconds.
function parseClockToSeconds(raw: string): number {
  const [hms, frac = '0'] = raw.split('.');
  const parts = hms.split(':').map((p) => parseInt(p, 10));
  const fracSeconds = parseFloat(`0.${frac}`) || 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2] + fracSeconds;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1] + fracSeconds;
  }
  return parts[0] + fracSeconds;
}

// Chess.com `time_control` formats: "300" (5 min sudden death), "300+5"
// (5 min + 5 sec increment), "1/86400" (daily, 1 day per move). Daily games
// don't fit the seconds model, so we return undefined for them.
function parseTimeControl(
  tc: string,
): { initial: number; increment: number } | undefined {
  if (tc.includes('/')) return undefined;
  const [initPart, incPart] = tc.split('+');
  const initial = parseInt(initPart, 10);
  if (isNaN(initial)) return undefined;
  const increment = incPart ? parseInt(incPart, 10) : 0;
  return { initial, increment: isNaN(increment) ? 0 : increment };
}

// Builds one snapshot per position. Index 0 is the starting clocks; each
// subsequent index reflects state after that half-move. Whichever side just
// moved gets their clock updated; the other side's clock is carried forward
// from the previous snapshot.
function extractClockSnapshots(
  pgn: string,
  timeControl: string,
): { snapshots: ClockSnapshot[]; increment: number } {
  const tc = parseTimeControl(timeControl);
  const initialSeconds = tc?.initial;
  const increment = tc?.increment ?? 0;

  const clockRegex = /\[%clk\s+([^\]]+)\]/g;
  const matches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = clockRegex.exec(pgn)) !== null) {
    matches.push(parseClockToSeconds(m[1].trim()));
  }

  const snapshots: ClockSnapshot[] = [
    { whiteSeconds: initialSeconds, blackSeconds: initialSeconds },
  ];

  let currentWhite = initialSeconds;
  let currentBlack = initialSeconds;
  for (let i = 0; i < matches.length; i++) {
    if (i % 2 === 0) currentWhite = matches[i];
    else currentBlack = matches[i];
    snapshots.push({ whiteSeconds: currentWhite, blackSeconds: currentBlack });
  }

  return { snapshots, increment };
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

export async function fetchLastGames(
  username: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<Game[]> {
  const archives = await fetchArchives(username, signal);
  if (archives.length === 0) return [];

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
      collected.push(monthGames[j]);
      if (collected.length >= limit) break;
    }
  }

  return collected.slice(0, limit).map((raw) => normalizeGame(raw, username));
}
