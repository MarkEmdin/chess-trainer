import type { ClockSnapshot } from '@/lib/games/types';

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

// Time control formats, as in Chess.com's `time_control` and the PGN
// [TimeControl] header: "300" (5 min sudden death), "300+5" (5 min + 5 sec
// increment), "1/86400" (daily, 1 day per move). Daily games don't fit the
// seconds model, so we return undefined for them.
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
export function extractClockSnapshots(
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

export type PgnPlayer = { name: string; rating?: number };

function pgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const m of pgn.matchAll(/^\[(\w+)\s+"([^"]*)"\]/gm)) {
    headers[m[1]] = m[2];
  }
  return headers;
}

function player(name: string | undefined, elo: string | undefined): PgnPlayer {
  const rating = Number(elo);
  return {
    name: name || '?',
    ...(elo && Number.isFinite(rating) ? { rating } : {}),
  };
}

// Players and per-position clocks of a stored PGN, from its headers and
// [%clk] comments (Chess.com and Lichess both export them). Anything missing
// degrades to "?" names, no rating, or undefined clocks.
export function readPgnInfo(pgn: string): {
  white: PgnPlayer;
  black: PgnPlayer;
  clocks: ClockSnapshot[];
} {
  const h = pgnHeaders(pgn);
  return {
    white: player(h.White, h.WhiteElo),
    black: player(h.Black, h.BlackElo),
    clocks: extractClockSnapshots(pgn, h.TimeControl ?? '').snapshots,
  };
}
