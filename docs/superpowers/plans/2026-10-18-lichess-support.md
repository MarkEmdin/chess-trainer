# Lichess Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Games and Key Positions work identically for Lichess accounts, with a platform switch when a user has both usernames saved.

**Architecture:** The normalized `Game` type and `findLongThinks` logic already don't know about Chess.com — they move to a new provider-agnostic `lib/games/`. A new `lib/lichess/` mirrors `lib/chesscom/`'s shape (API client, SWR hook, stored-username hook). `ChessComShell` generalizes into `GamesShell`, which owns the platform switch; `ChessComUsernameForm` generalizes into `UsernameForm`. Consumers (`ChessComGames`, `LongThinks`) and both pages swap in the new shell with minimal changes.

**Tech Stack:** Next.js 16, TypeScript strict, SWR, next-intl, Jest + RTL, chess.js.

**Spec:** `specs/002-lichess-support.md`

## Global Constraints

- No DB migration — `user_profiles.lichess_username` already exists and is already editable via `/profile`.
- `lib/games/longThinks.ts` must be a byte-for-byte move (no logic changes) — it is already provider-agnostic.
- Normalization differences from Chess.com's `lib/chesscom/api.ts`: Lichess's `clock.initial`/`clock.increment` are already numbers (no string parsing like `parseTimeControl`); its `clocks` array is centiseconds, one entry per ply; `opening.name` is a ready string (no URL-slug decoding).
- Platform toggle visibility rule: shown only when **both** usernames are saved (switch) or **neither** is saved (pick which one to enter) — never shown when exactly one is saved.
- `npm run lint` must stay at zero warnings; `npm run build` must pass (this touches routing/types).
- Before writing `lib/lichess/api.ts`'s implementation, the real Lichess API response for a live username must be checked against the field-mapping table in the spec — the spec's table is built from Lichess's official OpenAPI spec, not a verified live call, and must be confirmed or corrected first.

---

### Task 1: Move shared game types/errors/longThinks into `lib/games/`

**Files:**
- Create: `lib/games/types.ts`
- Create: `lib/games/errors.ts`
- Create: `lib/games/longThinks.ts`
- Create: `tests/lib/games/longThinks.test.ts` (moved from `tests/lib/chesscom/longThinks.test.ts`)
- Modify: `lib/chesscom/types.ts` (keep only Chess.com-raw types)
- Delete: `lib/chesscom/errors.ts`, `lib/chesscom/longThinks.ts`, `tests/lib/chesscom/longThinks.test.ts`
- Modify (import paths only): `lib/chesscom/api.ts`, `lib/chesscom/useChessComGames.ts`, `tests/lib/chesscom/api.test.ts`, `app/components/GameMatchup/index.tsx`, `app/components/LongThinks/index.tsx`, `app/components/LongThinks/LongThinkCard.tsx`, `app/components/ChessComShell/index.tsx`, `app/components/ChessComGames/GamesList.tsx`, `app/components/ChessComGames/GameModal.tsx`, `app/components/ChessComGames/GameTile.tsx`, `app/components/ChessComGames/index.tsx`, `app/components/CoachingRequestModal/index.tsx`, `tests/app/components/ChessComGames/GameTile.test.tsx`, `tests/app/components/ChessComShell/index.test.tsx`, `tests/app/components/LongThinks/LongThinkCard.test.tsx`, `tests/app/components/GameMatchup/index.test.tsx`

**Interfaces:**
- Produces: `Game`, `GamePlayer`, `GameResult`, `GameColor`, `TimeClass`, `ClockSnapshot`, `Platform` from `@/lib/games/types`
- Produces: `PlayerNotFoundError` from `@/lib/games/errors`
- Produces: `findLongThinks`, `LongThink` from `@/lib/games/longThinks` (identical API to the old `@/lib/chesscom/longThinks`)

This task is a pure refactor (no behavior change) — verified by running the full existing suite green, not new tests.

- [ ] **Step 1: Create `lib/games/types.ts`**

```ts
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
```

- [ ] **Step 2: Create `lib/games/errors.ts`**

```ts
export class PlayerNotFoundError extends Error {
  constructor(public readonly username: string) {
    super(`Player "${username}" not found`);
    this.name = 'PlayerNotFoundError';
  }
}
```

- [ ] **Step 3: Create `lib/games/longThinks.ts`**

Copy the full current contents of `lib/chesscom/longThinks.ts` verbatim — the only change is that the relative import `from './types'` now resolves within `lib/games/` instead of `lib/chesscom/`, so the import line itself doesn't need to change (both files are moving into the same new directory). Read `lib/chesscom/longThinks.ts` and copy it exactly to `lib/games/longThinks.ts`, unchanged.

- [ ] **Step 4: Create `tests/lib/games/longThinks.test.ts`**

Copy the full current contents of `tests/lib/chesscom/longThinks.test.ts` to `tests/lib/games/longThinks.test.ts`, changing only its two import lines:
```ts
import { findLongThinks } from '@/lib/games/longThinks';
import type { Game } from '@/lib/games/types';
```
(previously `@/lib/chesscom/longThinks` and `@/lib/chesscom/types`). Everything else in the file is unchanged.

- [ ] **Step 5: Delete the moved files**

```bash
rm lib/chesscom/longThinks.ts lib/chesscom/errors.ts tests/lib/chesscom/longThinks.test.ts
```

- [ ] **Step 6: Trim `lib/chesscom/types.ts` to only Chess.com-raw types**

Replace the entire file with:
```ts
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
```

- [ ] **Step 7: Fix `lib/chesscom/api.ts`'s imports**

Replace the top two import lines:
```ts
import { PlayerNotFoundError } from './errors';
import type {
  ChessComArchivesResponse,
  ChessComMonthResponse,
  ChessComRawGame,
  ClockSnapshot,
  Game,
  GameResult,
} from './types';
```
with:
```ts
import { PlayerNotFoundError } from '@/lib/games/errors';
import type {
  ChessComArchivesResponse,
  ChessComMonthResponse,
  ChessComRawGame,
} from './types';
import type { ClockSnapshot, Game, GameResult } from '@/lib/games/types';
```
Nothing else in this file changes.

- [ ] **Step 8: Fix `lib/chesscom/useChessComGames.ts`'s imports**

Replace:
```ts
import { PlayerNotFoundError } from './errors';
import type { Game } from './types';
```
with:
```ts
import { PlayerNotFoundError } from '@/lib/games/errors';
import type { Game } from '@/lib/games/types';
```

- [ ] **Step 9: Fix the remaining 13 import-path-only files**

In each file below, change the import source string exactly as shown (everything else — the imported names, surrounding code — is unchanged):

| File | Change |
|---|---|
| `tests/lib/chesscom/api.test.ts` | `from '@/lib/chesscom/errors'` → `from '@/lib/games/errors'` |
| `app/components/GameMatchup/index.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `app/components/LongThinks/index.tsx` | both `from '@/lib/chesscom/longThinks'` → `from '@/lib/games/longThinks'` and `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `app/components/LongThinks/LongThinkCard.tsx` | both `from '@/lib/chesscom/longThinks'` → `from '@/lib/games/longThinks'` and `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `app/components/ChessComShell/index.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `app/components/ChessComGames/GamesList.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `app/components/ChessComGames/GameModal.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `app/components/ChessComGames/GameTile.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `app/components/ChessComGames/index.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `app/components/CoachingRequestModal/index.tsx` | both `from '@/lib/chesscom/longThinks'` → `from '@/lib/games/longThinks'` and `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `tests/app/components/ChessComGames/GameTile.test.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `tests/app/components/ChessComShell/index.test.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `tests/app/components/LongThinks/LongThinkCard.test.tsx` | both `from '@/lib/chesscom/longThinks'` → `from '@/lib/games/longThinks'` and `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |
| `tests/app/components/GameMatchup/index.test.tsx` | `from '@/lib/chesscom/types'` → `from '@/lib/games/types'` |

- [ ] **Step 10: Run the full suite and verify nothing broke**

Run: `npm test`
Expected: PASS, same test count as before this task (no tests added or removed — this is a pure move).

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 11: Commit**

```bash
git add lib/games lib/chesscom tests/lib/games tests/lib/chesscom app/components tests/app/components
git commit -m "refactor: move provider-agnostic game types/errors/longThinks to lib/games"
```

---

### Task 2: Lichess API client (`lib/lichess/api.ts`)

**Files:**
- Create: `lib/lichess/types.ts` (raw Lichess API types)
- Create: `lib/lichess/api.ts`
- Create: `tests/lib/lichess/api.test.ts`

**Interfaces:**
- Consumes: `PlayerNotFoundError` from `@/lib/games/errors`; `Game`, `GameResult`, `ClockSnapshot`, `TimeClass` from `@/lib/games/types`; `Chess` from `chess.js`
- Produces: `fetchLastGames(username: string, limit?: number, signal?: AbortSignal): Promise<Game[]>` — same signature as `lib/chesscom/api.ts`'s function of the same name

- [ ] **Step 1: Live-verify the real Lichess response before writing anything else**

Run this exact command and save the raw output:
```bash
curl -s "https://lichess.org/api/games/user/EmdinMark?max=3&clocks=true&opening=true&pgnInJson=true" -H "Accept: application/x-ndjson"
```
`EmdinMark` is a real, active Lichess account (confirmed via `https://lichess.org/api/user/EmdinMark`, 992 games) — usable for this check. Each line of the output should be one JSON object shaped like Lichess's documented `GameJson` schema (fields: `id`, `rated`, `speed`, `createdAt`, `lastMoveAt`, `status`, `players.white.user.name`, `players.white.rating`, `players.black.*`, `winner`, `opening.name`, `pgn`, `clock.initial`, `clock.increment`, `clocks` as an array of centisecond integers).

**If this command fails or 404s** (the research phase for this spec hit exactly this from one sandboxed network — looked like bot/WAF protection on this specific streaming endpoint, not a real "not found": `/api/user/EmdinMark` worked fine from the same environment): try again from a different network context if available (e.g. ask the person running this to run the curl themselves and paste the output back), or try with a different `User-Agent` header (`-H "User-Agent: Mozilla/5.0"`). Do not proceed to Step 2 on a guess — if truly blocked everywhere, use the schema below (it's sourced from Lichess's official OpenAPI spec at `https://github.com/lichess-org/api/blob/master/doc/specs/schemas/GameJson.yaml`) but flag this explicitly as unverified in your report, with status `DONE_WITH_CONCERNS`.

**If the real response differs from the shape below in any field name or type, update Steps 2-4 to match reality before implementing** — the mapping below is the best available documentation-derived design, not a confirmed-live contract.

- [ ] **Step 2: Create `lib/lichess/types.ts`**

```ts
// Raw types matching Lichess's public "export games of a user" API.
// See https://lichess.org/api#tag/Games/operation/apiGamesUser

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
```

- [ ] **Step 3: Write the failing test**

Create `tests/lib/lichess/api.test.ts`. Use the field shapes confirmed in Step 1 — if they matched the schema in Step 2 exactly, use this test as written; otherwise adjust the fixture to match what you actually observed:

```ts
import { fetchLastGames } from '@/lib/lichess/api';
import { PlayerNotFoundError } from '@/lib/games/errors';
import type { LichessGame } from '@/lib/lichess/types';

function makeRawGame(overrides: Partial<LichessGame> = {}): LichessGame {
  return {
    id: 'game1',
    rated: true,
    speed: 'blitz',
    createdAt: 1_714_780_000_000,
    lastMoveAt: 1_714_780_120_000,
    status: 'mate',
    players: {
      white: { user: { name: 'alice', id: 'alice' }, rating: 1500 },
      black: { user: { name: 'bob', id: 'bob' }, rating: 1700 },
    },
    winner: 'white',
    opening: { eco: 'C50', name: 'Italian Game', ply: 4 },
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
    clock: { initial: 180, increment: 0, totalTime: 180 },
    clocks: [17800, 17750, 17700, 17650, 17600, 17550],
    ...overrides,
  };
}

function ndjsonResponse(games: LichessGame[], status = 200) {
  const body = games.map((g) => JSON.stringify(g)).join('\n');
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

function mockFetch(response: ReturnType<typeof ndjsonResponse>) {
  const mock = jest.fn().mockResolvedValue(response);
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('fetchLastGames (Lichess)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws PlayerNotFoundError on a 404', async () => {
    mockFetch(ndjsonResponse([], 404));
    await expect(fetchLastGames('ghost')).rejects.toBeInstanceOf(
      PlayerNotFoundError,
    );
  });

  it('returns an empty list for an account with no games', async () => {
    mockFetch(ndjsonResponse([]));
    await expect(fetchLastGames('newbie')).resolves.toEqual([]);
  });

  it('normalizes a game where the requested user is white', async () => {
    mockFetch(ndjsonResponse([makeRawGame()]));
    const [game] = await fetchLastGames('alice');

    expect(game.id).toBe('game1');
    expect(game.url).toBe('https://lichess.org/game1');
    expect(game.userColor).toBe('white');
    expect(game.user).toEqual({ username: 'alice', rating: 1500 });
    expect(game.opponent).toEqual({ username: 'bob', rating: 1700 });
    expect(game.result).toBe('win');
    expect(game.opening).toBe('Italian Game');
    expect(game.increment).toBe(0);
    expect(game.timeClass).toBe('blitz');
  });

  it('normalizes a game where the requested user is black and lost', async () => {
    mockFetch(ndjsonResponse([makeRawGame({ winner: 'white' })]));
    const [game] = await fetchLastGames('bob');

    expect(game.userColor).toBe('black');
    expect(game.result).toBe('loss');
  });

  it('marks a drawn game (no winner) as a draw', async () => {
    mockFetch(ndjsonResponse([makeRawGame({ winner: undefined })]));
    const [game] = await fetchLastGames('alice');
    expect(game.result).toBe('draw');
  });

  it('converts centisecond clocks to seconds in clockSnapshots', async () => {
    mockFetch(ndjsonResponse([makeRawGame()]));
    const [game] = await fetchLastGames('alice');

    expect(game.clockSnapshots[0]).toEqual({
      whiteSeconds: 180,
      blackSeconds: 180,
    });
    expect(game.clockSnapshots[1]).toEqual({
      whiteSeconds: 178,
      blackSeconds: 180,
    });
  });

  it('maps ultraBullet and correspondence onto the existing 4 time classes', async () => {
    mockFetch(
      ndjsonResponse([makeRawGame({ speed: 'correspondence', id: 'g2' })]),
    );
    const [game] = await fetchLastGames('alice');
    expect(game.timeClass).toBe('daily');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- tests/lib/lichess/api.test.ts`
Expected: FAIL — cannot find module `@/lib/lichess/api`.

- [ ] **Step 5: Implement `lib/lichess/api.ts`**

```ts
import { Chess } from 'chess.js';
import { PlayerNotFoundError } from '@/lib/games/errors';
import type { ClockSnapshot, Game, GameResult, TimeClass } from '@/lib/games/types';
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
  limit: number,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${API_BASE}/games/user/${encodeURIComponent(username)}?max=${limit}&clocks=true&opening=true&pgnInJson=true`;
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

export async function fetchLastGames(
  username: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<Game[]> {
  const text = await fetchGamesNdjson(username, limit, signal);
  const rawGames = parseNdjson(text);
  return rawGames.map((raw) => normalizeGame(raw, username));
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- tests/lib/lichess/api.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add lib/lichess/types.ts lib/lichess/api.ts tests/lib/lichess/api.test.ts
git commit -m "feat: add Lichess API client with field-mapping normalizer"
```

---

### Task 3: Lichess hooks (`useLichessGames`, `useStoredLichessUsername`)

**Files:**
- Create: `lib/lichess/useLichessGames.ts`
- Create: `lib/lichess/useStoredLichessUsername.ts`
- Create: `tests/lib/lichess/useStoredLichessUsername.test.ts`

**Interfaces:**
- Consumes: `fetchLastGames` from `./api` (Task 2); `Game` from `@/lib/games/types`; `PlayerNotFoundError` from `@/lib/games/errors`
- Produces: `useLichessGames(username: string | null): UseLichessGamesResult` (same shape as `useChessComGames`'s result type); `useStoredLichessUsername(): [string | null, (next: string | null) => void]`

No test file for `useLichessGames.ts` itself — `useChessComGames.ts` has none either (verified: only `api.test.ts`, `format.test.ts`, `longThinks.test.ts`, `useStoredThreshold.test.ts`, `useStoredUsername.test.ts` exist under `tests/lib/chesscom/`). It's exercised indirectly through `GamesShell`'s tests (Task 8).

- [ ] **Step 1: Create `lib/lichess/useLichessGames.ts`**

```ts
'use client';

import useSWR from 'swr';
import { fetchLastGames } from './api';
import { PlayerNotFoundError } from '@/lib/games/errors';
import type { Game } from '@/lib/games/types';

export type UseLichessGamesResult = {
  games: Game[] | null;
  error: Error | null;
  isLoading: boolean;
  isNotFound: boolean;
};

type FetchKey = readonly ['lichess-games', string];

const fetcher = ([, username]: FetchKey) => fetchLastGames(username, 10);

export function useLichessGames(username: string | null): UseLichessGamesResult {
  const key: FetchKey | null = username ? ['lichess-games', username] : null;

  const { data, error, isLoading } = useSWR<Game[], Error>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    games: data ?? null,
    error: error ?? null,
    isLoading,
    isNotFound: error instanceof PlayerNotFoundError,
  };
}
```

- [ ] **Step 2: Write the failing test for `useStoredLichessUsername`**

Create `tests/lib/lichess/useStoredLichessUsername.test.ts` (mirrors `tests/lib/chesscom/useStoredUsername.test.ts` exactly, with the Lichess storage key):

```ts
import { act, renderHook } from '@testing-library/react';
import { useStoredLichessUsername } from '@/lib/lichess/useStoredLichessUsername';

const STORAGE_KEY = 'lichess-username';

describe('useStoredLichessUsername', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when localStorage is empty', () => {
    const { result } = renderHook(() => useStoredLichessUsername());
    expect(result.current[0]).toBeNull();
  });

  it('reads an existing value synchronously on first render', () => {
    localStorage.setItem(STORAGE_KEY, 'drnykterstein');
    const { result } = renderHook(() => useStoredLichessUsername());
    expect(result.current[0]).toBe('drnykterstein');
  });

  it('persists a new value to localStorage', () => {
    const { result } = renderHook(() => useStoredLichessUsername());
    act(() => {
      result.current[1]('hikaru');
    });
    expect(result.current[0]).toBe('hikaru');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('hikaru');
  });

  it('removes the key when set to null', () => {
    localStorage.setItem(STORAGE_KEY, 'hikaru');
    const { result } = renderHook(() => useStoredLichessUsername());
    act(() => {
      result.current[1](null);
    });
    expect(result.current[0]).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps multiple hook instances in sync within the same tab', () => {
    const first = renderHook(() => useStoredLichessUsername());
    const second = renderHook(() => useStoredLichessUsername());

    act(() => {
      first.result.current[1]('alirezafirouzja');
    });

    expect(second.result.current[0]).toBe('alirezafirouzja');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- tests/lib/lichess/useStoredLichessUsername.test.ts`
Expected: FAIL — cannot find module `@/lib/lichess/useStoredLichessUsername`.

- [ ] **Step 4: Implement `lib/lichess/useStoredLichessUsername.ts`**

```ts
'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'lichess-username';

// The native `storage` event only fires in *other* tabs after a localStorage
// write. We dispatch a custom event so subscribers in the same tab also
// re-read on every setter call — keeps multiple hook instances in sync.
const SAME_TAB_EVENT = 'lichess-username:change';

function subscribe(onChange: () => void): () => void {
  const handler = (e: Event) => {
    if (e instanceof StorageEvent && e.key !== null && e.key !== STORAGE_KEY) {
      return;
    }
    onChange();
  };
  window.addEventListener('storage', handler);
  window.addEventListener(SAME_TAB_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(SAME_TAB_EVENT, handler);
  };
}

function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): null {
  return null;
}

export function useStoredLichessUsername(): [
  string | null,
  (next: string | null) => void,
] {
  const username = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setUsername = useCallback((next: string | null) => {
    if (next === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, []);

  return [username, setUsername];
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- tests/lib/lichess/useStoredLichessUsername.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/lichess/useLichessGames.ts lib/lichess/useStoredLichessUsername.ts tests/lib/lichess/useStoredLichessUsername.test.ts
git commit -m "feat: add Lichess games and stored-username hooks"
```

---

### Task 4: `updateLichessUsername` server action

**Files:**
- Modify: `lib/auth/profileActions.ts`

**Interfaces:**
- Produces: `updateLichessUsername(username: string | null): Promise<void>`

No new test file — `updateChesscomUsername` (the function this mirrors) has no test of its own either; both are exercised indirectly wherever they're called.

- [ ] **Step 1: Add the function**

In `lib/auth/profileActions.ts`, add this function at the end of the file, immediately after `updateChesscomUsername`:

```ts
// Lichess equivalent of updateChesscomUsername — same reasoning: mirrors a
// value the user typed in the Lichess lookup form (validated loosely by the
// platform's own 404 response), fire-and-forget, no-op for guests.
export async function updateLichessUsername(
  username: string | null,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const trimmed = username?.trim();
  await supabase
    .from('user_profiles')
    .update({ lichess_username: trimmed || null })
    .eq('id', user.id);
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/profileActions.ts
git commit -m "feat: add updateLichessUsername server action"
```

---

### Task 5: Translation keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

No test file — data-only change, verified by the component tests in Tasks 6-9 (which render through `renderWithIntl` using the real `en.json`) and by `npm run build`.

- [ ] **Step 1: Edit `messages/en.json`**

Replace lines 242-278 (the entire `games` top-level block) with:
```json
  "games": {
    "title": "Games",
    "subtitle": "Browse your last 10 games on Chess.com or Lichess.",
    "usernameForm": {
      "chesscomLabel": "Chess.com username",
      "lichessLabel": "Lichess username",
      "placeholder": "e.g. MarkEmdin",
      "submit": "Load games",
      "change": "Change user"
    },
    "platformToggle": {
      "chesscom": "Chess.com",
      "lichess": "Lichess"
    },
    "list": {
      "showing": "Showing the last {count} games of {username}"
    },
    "tile": {
      "result": {
        "win": "Win",
        "loss": "Loss",
        "draw": "Draw"
      },
      "timeClass": {
        "bullet": "Bullet",
        "blitz": "Blitz",
        "rapid": "Rapid",
        "daily": "Daily"
      }
    },
    "modal": {
      "moveCounter": "Move {current} / {total}",
      "startPosition": "Starting position",
      "firstMove": "Go to start",
      "prevMove": "Previous move",
      "nextMove": "Next move",
      "lastMove": "Go to end",
      "lastMoveCaption": "Last move: {move}",
      "lastMoveWithDuration": "Last move: {move} — {duration}",
      "viewGame": "View game"
    }
  },
```

Replace lines 299-304 (the `common.chesscom` block, inside `common`) with:
```json
    "games": {
      "loading": "Loading games…",
      "errorGeneric": "Could not load games. Try again.",
      "errorNotFound": "Player not found.",
      "emptyGames": "This player has no games yet."
    },
```

- [ ] **Step 2: Edit `messages/ru.json`** (same line numbers, 242-278 and 299-304)

Replace the `games` block with:
```json
  "games": {
    "title": "Партии",
    "subtitle": "Последние 10 партий на Chess.com или Lichess.",
    "usernameForm": {
      "chesscomLabel": "Ник на Chess.com",
      "lichessLabel": "Ник на Lichess",
      "placeholder": "например, MarkEmdin",
      "submit": "Загрузить партии",
      "change": "Сменить пользователя"
    },
    "platformToggle": {
      "chesscom": "Chess.com",
      "lichess": "Lichess"
    },
    "list": {
      "showing": "Последние {count} партий пользователя {username}"
    },
    "tile": {
      "result": {
        "win": "Победа",
        "loss": "Поражение",
        "draw": "Ничья"
      },
      "timeClass": {
        "bullet": "Пуля",
        "blitz": "Блиц",
        "rapid": "Рапид",
        "daily": "Дейли"
      }
    },
    "modal": {
      "moveCounter": "Ход {current} / {total}",
      "startPosition": "Начальная позиция",
      "firstMove": "В начало",
      "prevMove": "Предыдущий ход",
      "nextMove": "Следующий ход",
      "lastMove": "В конец",
      "lastMoveCaption": "Последний ход: {move}",
      "lastMoveWithDuration": "Последний ход: {move} — {duration}",
      "viewGame": "Открыть партию"
    }
  },
```

Replace the `common.chesscom` block with:
```json
    "games": {
      "loading": "Загружаем партии…",
      "errorGeneric": "Не удалось загрузить партии. Попробуйте ещё раз.",
      "errorNotFound": "Пользователь не найден.",
      "emptyGames": "У этого пользователя ещё нет партий."
    },
```

- [ ] **Step 3: Verify both files are still valid JSON and structurally identical**

Run: `node -e "const en=require('./messages/en.json'); const ru=require('./messages/ru.json'); const keys=o=>JSON.stringify(Object.keys(o).sort()); const walk=(a,b,path)=>{ if(keys(a)!==keys(b)) throw new Error('key mismatch at '+path); Object.keys(a).forEach(k=>{ if(typeof a[k]==='object') walk(a[k],b[k],path+'.'+k); }); }; walk(en,ru,'root'); console.log('OK');"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat: add Lichess-related translation keys, genericize games copy"
```

---

### Task 6: `PlatformToggle` component

**Files:**
- Create: `app/components/PlatformToggle/index.tsx`
- Create: `tests/app/components/PlatformToggle/index.test.tsx`

**Interfaces:**
- Consumes: `Platform` from `@/lib/games/types`; `Button` from `@/app/components/ui/button`
- Produces: default export `PlatformToggle({ value: Platform; onChange: (platform: Platform) => void })`

- [ ] **Step 1: Write the failing test**

Create `tests/app/components/PlatformToggle/index.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import PlatformToggle from '@/app/components/PlatformToggle';

describe('<PlatformToggle />', () => {
  it('renders both platform options', () => {
    renderWithIntl(<PlatformToggle value="chesscom" onChange={() => {}} />);
    expect(
      screen.getByRole('tab', { name: /chess\.com/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /lichess/i })).toBeInTheDocument();
  });

  it('marks the active platform as selected', () => {
    renderWithIntl(<PlatformToggle value="lichess" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /lichess/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /chess\.com/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the clicked platform', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<PlatformToggle value="chesscom" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /lichess/i }));
    expect(onChange).toHaveBeenCalledWith('lichess');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/app/components/PlatformToggle`
Expected: FAIL — cannot find module `@/app/components/PlatformToggle`.

- [ ] **Step 3: Implement the component**

Create `app/components/PlatformToggle/index.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import type { Platform } from '@/lib/games/types';

type Props = {
  value: Platform;
  onChange: (platform: Platform) => void;
};

const PLATFORMS: Platform[] = ['chesscom', 'lichess'];

export default function PlatformToggle({ value, onChange }: Props) {
  const t = useTranslations('games.platformToggle');

  return (
    <div className="flex gap-2" role="tablist">
      {PLATFORMS.map((platform) => (
        <Button
          key={platform}
          type="button"
          variant={value === platform ? 'default' : 'outline'}
          size="sm"
          role="tab"
          aria-selected={value === platform}
          onClick={() => onChange(platform)}
        >
          {t(platform)}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/app/components/PlatformToggle`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/components/PlatformToggle tests/app/components/PlatformToggle
git commit -m "feat: add PlatformToggle component"
```

---

### Task 7: Generalize `ChessComUsernameForm` → `UsernameForm`

**Files:**
- Create: `app/components/UsernameForm/index.tsx`
- Create: `tests/app/components/UsernameForm/index.test.tsx`
- Delete: `app/components/ChessComUsernameForm/index.tsx`, `tests/app/components/ChessComUsernameForm/index.test.tsx`

**Interfaces:**
- Consumes: `Platform` from `@/lib/games/types`
- Produces: default export `UsernameForm({ platform: Platform; onSubmit: (username: string) => void })`

- [ ] **Step 1: Write the failing test**

Create `tests/app/components/UsernameForm/index.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import UsernameForm from '@/app/components/UsernameForm';

describe('<UsernameForm />', () => {
  it('shows the chess.com label when platform is chesscom', () => {
    renderWithIntl(<UsernameForm platform="chesscom" onSubmit={() => {}} />);
    expect(screen.getByLabelText(/chess\.com username/i)).toBeInTheDocument();
  });

  it('shows the lichess label when platform is lichess', () => {
    renderWithIntl(<UsernameForm platform="lichess" onSubmit={() => {}} />);
    expect(screen.getByLabelText(/lichess username/i)).toBeInTheDocument();
  });

  it('disables submit while the input is empty', () => {
    renderWithIntl(<UsernameForm platform="chesscom" onSubmit={() => {}} />);
    expect(
      screen.getByRole('button', { name: /load games/i }),
    ).toBeDisabled();
  });

  it('calls onSubmit with the trimmed value', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<UsernameForm platform="lichess" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/lichess username/i), '  hikaru  ');
    await user.click(screen.getByRole('button', { name: /load games/i }));
    expect(onSubmit).toHaveBeenCalledWith('hikaru');
  });

  it('keeps submit disabled for whitespace-only input', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    renderWithIntl(<UsernameForm platform="chesscom" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/chess\.com username/i), '   ');
    expect(
      screen.getByRole('button', { name: /load games/i }),
    ).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/app/components/UsernameForm`
Expected: FAIL — cannot find module `@/app/components/UsernameForm`.

- [ ] **Step 3: Implement the component**

Create `app/components/UsernameForm/index.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import type { Platform } from '@/lib/games/types';

type Props = {
  platform: Platform;
  onSubmit: (username: string) => void;
};

export default function UsernameForm({ platform, onSubmit }: Props) {
  const t = useTranslations('games.usernameForm');
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const labelKey = platform === 'chesscom' ? 'chesscomLabel' : 'lichessLabel';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
      <label
        htmlFor="platform-username"
        className="text-sm font-medium text-foreground"
      >
        {t(labelKey)}
      </label>
      <div className="flex gap-2">
        <Input
          id="platform-username"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('placeholder')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Button type="submit" disabled={!input.trim()}>
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/app/components/UsernameForm`
Expected: PASS, 5 tests.

- [ ] **Step 5: Delete the old component and test**

```bash
rm -r app/components/ChessComUsernameForm tests/app/components/ChessComUsernameForm
```

- [ ] **Step 6: Commit**

```bash
git add -A app/components/UsernameForm app/components/ChessComUsernameForm tests/app/components/UsernameForm tests/app/components/ChessComUsernameForm
git commit -m "feat: generalize ChessComUsernameForm into platform-aware UsernameForm"
```

---

### Task 8: Generalize `ChessComShell` → `GamesShell`

**Files:**
- Create: `app/components/GamesShell/index.tsx`
- Create: `tests/app/components/GamesShell/index.test.tsx`
- Delete: `app/components/ChessComShell/index.tsx`, `tests/app/components/ChessComShell/index.test.tsx`

**Interfaces:**
- Consumes: `useChessComGames` from `@/lib/chesscom/useChessComGames`; `useStoredUsername` from `@/lib/chesscom/useStoredUsername`; `useLichessGames` from `@/lib/lichess/useLichessGames` (Task 3); `useStoredLichessUsername` from `@/lib/lichess/useStoredLichessUsername` (Task 3); `updateChesscomUsername`, `updateLichessUsername` from `@/lib/auth/profileActions` (Task 4); `Game`, `Platform` from `@/lib/games/types`; `PlatformToggle` (Task 6); `UsernameForm` (Task 7)
- Produces: default export `GamesShell` with props `{ isAuthenticated: boolean; initialChesscomUsername: string | null; initialLichessUsername: string | null; renderStatus; emptyMessage: string; children }` — same `renderStatus`/`children` callback shapes as the old `ChessComShell`

This is the integration task — most judgment required of the whole plan.

- [ ] **Step 1: Write the failing tests**

Create `tests/app/components/GamesShell/index.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import GamesShell from '@/app/components/GamesShell';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useLichessGames } from '@/lib/lichess/useLichessGames';
import type { Game } from '@/lib/games/types';

jest.mock('@/lib/chesscom/useChessComGames', () => ({
  useChessComGames: jest.fn(),
}));
jest.mock('@/lib/lichess/useLichessGames', () => ({
  useLichessGames: jest.fn(),
}));
jest.mock('@/lib/auth/profileActions', () => ({
  updateChesscomUsername: jest.fn(),
  updateLichessUsername: jest.fn(),
}));

const mockUseChessComGames = useChessComGames as jest.MockedFunction<
  typeof useChessComGames
>;
const mockUseLichessGames = useLichessGames as jest.MockedFunction<
  typeof useLichessGames
>;

function idleResult() {
  return { games: null, error: null, isLoading: false, isNotFound: false };
}

const makeGame = (id: string): Game => ({
  id,
  url: '',
  pgn: '',
  endTime: new Date(),
  timeClass: 'blitz',
  timeControl: '180',
  increment: 0,
  userColor: 'white',
  user: { username: 'alice', rating: 1500 },
  opponent: { username: 'bob', rating: 1700 },
  result: 'draw',
  finalFen: '',
  clockSnapshots: [],
});

function shell() {
  return renderWithIntl(
    <GamesShell
      isAuthenticated={false}
      initialChesscomUsername={null}
      initialLichessUsername={null}
      emptyMessage="no-games-here"
      renderStatus={({ games }) => `status-${games.length}`}
    >
      {() => <div data-testid="children">CONTENT</div>}
    </GamesShell>,
  );
}

describe('<GamesShell />', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseChessComGames.mockReturnValue(idleResult());
    mockUseLichessGames.mockReturnValue(idleResult());
  });

  it('shows a platform picker and the chess.com form when nothing is saved', () => {
    shell();
    expect(
      screen.getByRole('tab', { name: /chess\.com/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/chess\.com username/i)).toBeInTheDocument();
  });

  it('switching the picker to lichess shows the lichess form', async () => {
    const user = userEvent.setup();
    shell();
    await user.click(screen.getByRole('tab', { name: /lichess/i }));
    expect(screen.getByLabelText(/lichess username/i)).toBeInTheDocument();
  });

  it('loads chess.com games directly with no toggle when only chesscom is saved', () => {
    localStorage.setItem('chesscom-username', 'alice');
    mockUseChessComGames.mockReturnValue({
      games: [makeGame('a')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    shell();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('status-1')).toBeInTheDocument();
    expect(mockUseLichessGames).toHaveBeenCalledWith(null);
  });

  it('loads lichess games directly with no toggle when only lichess is saved', () => {
    localStorage.setItem('lichess-username', 'bob');
    mockUseLichessGames.mockReturnValue({
      games: [makeGame('b')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    shell();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('status-1')).toBeInTheDocument();
    expect(mockUseChessComGames).toHaveBeenCalledWith(null);
  });

  it('shows the not-found error when the active platform reports isNotFound', () => {
    localStorage.setItem('chesscom-username', 'ghost');
    mockUseChessComGames.mockReturnValue({
      games: null,
      error: new Error('fail'),
      isLoading: false,
      isNotFound: true,
    });
    shell();
    expect(screen.getByText(/player not found/i)).toBeInTheDocument();
  });

  it('shows a generic error for any other failure', () => {
    localStorage.setItem('lichess-username', 'alice');
    mockUseLichessGames.mockReturnValue({
      games: null,
      error: new Error('fail'),
      isLoading: false,
      isNotFound: false,
    });
    shell();
    expect(screen.getByText(/could not load games/i)).toBeInTheDocument();
  });

  it('shows a toggle and switches platforms when both are saved', async () => {
    localStorage.setItem('chesscom-username', 'alice');
    localStorage.setItem('lichess-username', 'bob');
    mockUseChessComGames.mockReturnValue({
      games: [makeGame('a'), makeGame('a2')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    mockUseLichessGames.mockReturnValue({
      games: [makeGame('b')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    const user = userEvent.setup();
    shell();

    expect(screen.getByText('status-2')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /lichess/i }));
    expect(screen.getByText('status-1')).toBeInTheDocument();
  });

  it('clears the saved username for the active platform on change-user click', async () => {
    localStorage.setItem('chesscom-username', 'alice');
    mockUseChessComGames.mockReturnValue({
      games: [makeGame('a')],
      error: null,
      isLoading: false,
      isNotFound: false,
    });
    const user = userEvent.setup();
    shell();
    await user.click(screen.getByRole('button', { name: /change user/i }));
    expect(localStorage.getItem('chesscom-username')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/app/components/GamesShell`
Expected: FAIL — cannot find module `@/app/components/GamesShell`.

- [ ] **Step 3: Implement the component**

Create `app/components/GamesShell/index.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useStoredUsername } from '@/lib/chesscom/useStoredUsername';
import { useLichessGames } from '@/lib/lichess/useLichessGames';
import { useStoredLichessUsername } from '@/lib/lichess/useStoredLichessUsername';
import {
  updateChesscomUsername,
  updateLichessUsername,
} from '@/lib/auth/profileActions';
import type { Game, Platform } from '@/lib/games/types';
import { Button } from '@/app/components/ui/button';
import PlatformToggle from '@/app/components/PlatformToggle';
import UsernameForm from '@/app/components/UsernameForm';

type RenderProps = {
  games: Game[];
  username: string;
};

type Props = {
  // True when the visitor is signed in — switches storage from
  // localStorage to user_profiles columns so values live in one place and
  // follow the user across devices.
  isAuthenticated: boolean;
  // Initial usernames for signed-in users (their saved profile values).
  // Ignored for guests, who read from localStorage.
  initialChesscomUsername: string | null;
  initialLichessUsername: string | null;
  renderStatus: (props: RenderProps) => React.ReactNode;
  emptyMessage: string;
  children: (props: RenderProps) => React.ReactNode;
};

// Common scaffolding for any feature that consumes the user's last 10 games
// from either Chess.com or Lichess. Owns: platform selection, username
// form, loading/error/no-games branches, the "change user" button, and the
// status line. Consumers focus on what to render once games are in hand.
export default function GamesShell({
  isAuthenticated,
  initialChesscomUsername,
  initialLichessUsername,
  renderStatus,
  emptyMessage,
  children,
}: Props) {
  // All four branches always render — conditional hooks are illegal.
  const [storedChesscomUsername, setStoredChesscomUsername] =
    useStoredUsername();
  const [storedLichessUsername, setStoredLichessUsername] =
    useStoredLichessUsername();
  const [profileChesscomUsername, setProfileChesscomUsername] =
    useState<string | null>(initialChesscomUsername);
  const [profileLichessUsername, setProfileLichessUsername] =
    useState<string | null>(initialLichessUsername);

  const chesscomUsername = isAuthenticated
    ? profileChesscomUsername
    : storedChesscomUsername;
  const lichessUsername = isAuthenticated
    ? profileLichessUsername
    : storedLichessUsername;

  const [platform, setPlatform] = useState<Platform>('chesscom');

  // When exactly one platform has a saved username, that one always wins —
  // no toggle, no stale state to reconcile. The toggle only matters when
  // both or neither are saved.
  const onlyLichessSaved = !chesscomUsername && !!lichessUsername;
  const onlyChesscomSaved = !!chesscomUsername && !lichessUsername;
  const effectivePlatform: Platform = onlyLichessSaved
    ? 'lichess'
    : onlyChesscomSaved
      ? 'chesscom'
      : platform;
  const showToggle =
    (!chesscomUsername && !lichessUsername) ||
    (!!chesscomUsername && !!lichessUsername);

  const username =
    effectivePlatform === 'chesscom' ? chesscomUsername : lichessUsername;

  const setUsername = (next: string | null) => {
    if (effectivePlatform === 'chesscom') {
      if (isAuthenticated) {
        setProfileChesscomUsername(next);
        // Fire-and-forget DB update — failure leaves the optimistic local
        // state in place, which the next page load will reconcile.
        void updateChesscomUsername(next);
      } else {
        setStoredChesscomUsername(next);
      }
    } else {
      if (isAuthenticated) {
        setProfileLichessUsername(next);
        void updateLichessUsername(next);
      } else {
        setStoredLichessUsername(next);
      }
    }
  };

  const chesscomResult = useChessComGames(
    effectivePlatform === 'chesscom' ? username : null,
  );
  const lichessResult = useLichessGames(
    effectivePlatform === 'lichess' ? username : null,
  );
  const { games, error, isLoading, isNotFound } =
    effectivePlatform === 'chesscom' ? chesscomResult : lichessResult;

  const tCommon = useTranslations('common.games');
  const tForm = useTranslations('games.usernameForm');

  if (!username) {
    return (
      <div className="flex flex-col gap-3">
        {showToggle && (
          <PlatformToggle value={effectivePlatform} onChange={setPlatform} />
        )}
        <UsernameForm
          key={effectivePlatform}
          platform={effectivePlatform}
          onSubmit={setUsername}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showToggle && (
        <PlatformToggle value={effectivePlatform} onChange={setPlatform} />
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1">
          {games && games.length > 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">
              {renderStatus({ games, username })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUsername(null)}
        >
          {tForm('change')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>{tCommon('loading')}</span>
        </div>
      )}

      {error && !isLoading && (
        <p className="text-destructive">
          {isNotFound ? tCommon('errorNotFound') : tCommon('errorGeneric')}
        </p>
      )}

      {games && !isLoading && games.length === 0 && (
        <p className="text-muted-foreground">{emptyMessage}</p>
      )}

      {games && games.length > 0 && children({ games, username })}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/app/components/GamesShell`
Expected: PASS, 8 tests.

- [ ] **Step 5: Delete the old component and test**

```bash
rm -r app/components/ChessComShell tests/app/components/ChessComShell
```

- [ ] **Step 6: Commit**

```bash
git add -A app/components/GamesShell app/components/ChessComShell tests/app/components/GamesShell tests/app/components/ChessComShell
git commit -m "feat: generalize ChessComShell into multi-platform GamesShell"
```

---

### Task 9: Wire consumers — `ChessComGames`, `LongThinks`, `GameModal` copy, both pages

**Files:**
- Modify: `app/components/ChessComGames/index.tsx`
- Modify: `app/components/LongThinks/index.tsx`
- Modify: `app/components/ChessComGames/GameModal.tsx` (one line — copy key rename)
- Modify: `app/[locale]/games/page.tsx`
- Modify: `app/[locale]/think-time/page.tsx`

**Interfaces:**
- Consumes: `GamesShell` (Task 8) in place of `ChessComShell`

These are glue changes with no new logic — the effective test is the existing suites (updated below) plus a successful `npm run build`.

- [ ] **Step 1: Update `app/components/ChessComGames/index.tsx`**

Replace the whole file:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { Game } from '@/lib/games/types';
import GamesShell from '@/app/components/GamesShell';
import GamesList from './GamesList';

// GameModal pulls in chess.js + react-chessboard (~heavy). Defer until the
// user actually clicks a tile — the landing experience on /games doesn't
// need the chess engine in the initial bundle.
const GameModal = dynamic(() => import('./GameModal'), { ssr: false });

type Props = {
  isAuthenticated: boolean;
  initialChesscomUsername: string | null;
  initialLichessUsername: string | null;
};

export default function ChessComGames({
  isAuthenticated,
  initialChesscomUsername,
  initialLichessUsername,
}: Props) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const t = useTranslations('games.list');
  const tCommon = useTranslations('common.games');

  return (
    <>
      <GamesShell
        isAuthenticated={isAuthenticated}
        initialChesscomUsername={initialChesscomUsername}
        initialLichessUsername={initialLichessUsername}
        emptyMessage={tCommon('emptyGames')}
        renderStatus={({ games, username }) =>
          t('showing', { username, count: games.length })
        }
      >
        {({ games }) => (
          <GamesList games={games} onSelect={setSelectedGame} />
        )}
      </GamesShell>

      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Update `app/components/LongThinks/index.tsx`**

Change the import and props/usage — replace:
```tsx
import ChessComShell from '@/app/components/ChessComShell';
```
with:
```tsx
import GamesShell from '@/app/components/GamesShell';
```

Change the `Props` type from:
```tsx
type Props = {
  isAuthenticated: boolean;
  initialUsername: string | null;
};

export default function LongThinks({
  isAuthenticated,
  initialUsername,
}: Props) {
```
to:
```tsx
type Props = {
  isAuthenticated: boolean;
  initialChesscomUsername: string | null;
  initialLichessUsername: string | null;
};

export default function LongThinks({
  isAuthenticated,
  initialChesscomUsername,
  initialLichessUsername,
}: Props) {
```

Change the JSX tag from `<ChessComShell isAuthenticated={isAuthenticated} initialUsername={initialUsername}` to `<GamesShell isAuthenticated={isAuthenticated} initialChesscomUsername={initialChesscomUsername} initialLichessUsername={initialLichessUsername}` and its matching closing tag `</ChessComShell>` to `</GamesShell>`. Nothing else in this file changes — the `children` render prop, threshold logic, and coaching modal wiring are untouched.

- [ ] **Step 3: Update `app/components/ChessComGames/GameModal.tsx`**

Find:
```tsx
                {t('viewOnChessCom')}
```
Replace with:
```tsx
                {t('viewGame')}
```
(one line — the `href={game.url}` above it already resolves correctly for both platforms per Task 2's normalizer.)

- [ ] **Step 4: Update `app/[locale]/games/page.tsx`**

Replace the whole file:

```tsx
import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import ChessComGames from '@/app/components/ChessComGames';

export default async function GamesPage() {
  const t = await getTranslations('games');
  const user = await getAuthedUser();

  // Signed-in visitors get their saved usernames from user_profiles (the
  // single source of truth, replacing localStorage). Guests get null and
  // fall through to the localStorage flow in GamesShell.
  let initialChesscomUsername: string | null = null;
  let initialLichessUsername: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('chesscom_username, lichess_username')
      .eq('id', user.id)
      .single();
    initialChesscomUsername = data?.chesscom_username ?? null;
    initialLichessUsername = data?.lichess_username ?? null;
  }

  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">{t('subtitle')}</p>
        <ChessComGames
          isAuthenticated={!!user}
          initialChesscomUsername={initialChesscomUsername}
          initialLichessUsername={initialLichessUsername}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `app/[locale]/think-time/page.tsx`**

Replace the whole file:

```tsx
import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import LongThinks from '@/app/components/LongThinks';

export default async function ThinkTimePage() {
  const t = await getTranslations('thinkTime');
  const user = await getAuthedUser();

  // Same auth-aware seed as /games: signed-in users pull their saved
  // usernames from user_profiles, guests fall back to localStorage inside
  // GamesShell.
  let initialChesscomUsername: string | null = null;
  let initialLichessUsername: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('chesscom_username, lichess_username')
      .eq('id', user.id)
      .single();
    initialChesscomUsername = data?.chesscom_username ?? null;
    initialLichessUsername = data?.lichess_username ?? null;
  }

  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">{t('subtitle')}</p>
        <LongThinks
          isAuthenticated={!!user}
          initialChesscomUsername={initialChesscomUsername}
          initialLichessUsername={initialLichessUsername}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run the full suite, lint, and build**

Run: `npm test`
Expected: PASS, all suites green (no behavior change to any test beyond what Tasks 1-8 already updated).

Run: `npm run lint`
Expected: zero warnings.

Run: `npm run build`
Expected: succeeds, `/[locale]/games` and `/[locale]/think-time` routes compile.

- [ ] **Step 7: Commit**

```bash
git add app/components/ChessComGames app/components/LongThinks "app/[locale]/games" "app/[locale]/think-time"
git commit -m "feat: wire Games and Key Positions through GamesShell for Lichess support"
```

---

## Final Verification

- [ ] Run the full suite: `npm test` — all tests pass
- [ ] Run `npm run lint` — zero warnings
- [ ] Run `npm run build` — succeeds
- [ ] Manually smoke-test against the real Lichess account `EmdinMark`: on `/games` and `/key-positions`, enter `EmdinMark` as a Lichess username (guest flow), confirm games load, open a game in the modal, confirm clock/move navigation works and the final position is correct
- [ ] Manually test the platform toggle end-to-end once a test account has both a Chess.com and a Lichess username saved via `/profile`
