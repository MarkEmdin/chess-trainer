# Spec: Lichess support for Games / Key Positions

Status: done
Branch: feature/lichess-support

## Problem

`Games` and `Key Positions` only fetch from Chess.com, using a saved `chesscom_username`. The profile
form already collects a `lichess_username` (`user_profiles.lichess_username`, already in the DB and
already editable on `/profile`), but nothing reads it — Lichess players get no value from either
feature.

## Goal

Both features work identically for Lichess accounts. A user with both usernames saved can switch
between platforms; a user with only one sees that platform directly, no switcher.

## Non-goals

- Merging games from both platforms into one combined list (explicitly rejected in favor of a
  platform switch — see design discussion)
- Any other feature beyond Games / Key Positions (Theory, Piece Values, World Champions untouched)
- Analysis/evaluation data (`evals`, `analysis` fields) — out of scope, neither platform's integration
  uses this today
- A 5th time-class bucket for Lichess's `classical`/`correspondence`/`ultraBullet` — mapped onto the
  existing 4 buckets (see Data & types) rather than extending the UI

## User-facing behavior

1. On `/games` and `/key-positions` (current route: `/think-time`), if the signed-in user (or guest,
   via localStorage) has **both** a Chess.com and a Lichess username saved, a small platform toggle
   appears (two buttons/tabs: "Chess.com" / "Lichess") above the username-derived content
2. If only one username is saved, that platform's games load directly — no toggle shown
3. If neither is saved, the existing username-entry form appears, now also offering a platform choice
   (which username are you entering)
4. Switching platforms re-fetches and re-renders the same UI (game list / long-think list) using the
   other platform's data — no page navigation
5. Guests get the same experience as signed-in users; a second `localStorage` key stores the Lichess
   username the same way the existing key stores Chess.com's

## Data & types

**Restructuring** (both platforms must consume the same normalized shape):
- Move `Game`, `GamePlayer`, `GameResult`, `GameColor`, `TimeClass`, `ClockSnapshot` from
  `lib/chesscom/types.ts` to a new `lib/games/types.ts`. `lib/chesscom/types.ts` keeps only the
  Chess.com-raw-API types (`ChessComRawGame`, etc.) and imports the normalized types from `lib/games/types.ts`.
- Move `lib/chesscom/longThinks.ts` → `lib/games/longThinks.ts` unchanged (it already only depends on
  the normalized `Game` type — confirmed by reading it, zero Chess.com-specific code inside).
- Move `lib/chesscom/errors.ts`'s `PlayerNotFoundError` → `lib/games/errors.ts` (shared by both
  providers' API clients).

**New: `lib/lichess/api.ts`** — mirrors `lib/chesscom/api.ts`'s `fetchLastGames(username, limit, signal)`
shape, returning `Promise<Game[]>`. Unlike Chess.com, Lichess's export endpoint returns the last N games
in one request — no archive-walking loop needed.

Request: `GET https://lichess.org/api/games/user/{username}?max={limit}&clocks=true&opening=true&pgnInJson=true`
with header `Accept: application/x-ndjson` (required for `pgnInJson` to take effect per Lichess's docs).
Response is newline-delimited JSON, one object per line, each shaped like `GameJson` in Lichess's
[official OpenAPI spec](https://github.com/lichess-org/api/blob/master/doc/specs/schemas/GameJson.yaml).
A 404 on this endpoint means the username doesn't exist — map to the shared `PlayerNotFoundError`
(`lib/games/errors.ts`), same as Chess.com's 404 handling.

**Field mapping, Lichess `GameJson` → normalized `Game`:**

| `Game` field | Source in Lichess response |
|---|---|
| `id` | `id` |
| `url` | `` `https://lichess.org/${id}` `` (not provided directly) |
| `pgn` | `pgn` (only present with `pgnInJson=true` + ndjson Accept header) |
| `endTime` | `new Date(lastMoveAt)` (already epoch-millis, no `* 1000` needed — unlike Chess.com's epoch-seconds) |
| `timeClass` | mapped from `speed`: `ultraBullet`→`bullet`, `bullet`→`bullet`, `blitz`→`blitz`, `rapid`→`rapid`, `classical`→`rapid`, `correspondence`→`daily` |
| `timeControl` | confirmed unused by any UI component (only read internally by Chess.com's own `extractClockSnapshots`, which Lichess doesn't need) — synthesize `` `${clock.initial}+${clock.increment}` `` purely to satisfy the type, never displayed |
| `increment` | `clock.increment` (already a plain number — no string parsing) |
| `userColor` | whichever of `players.white`/`players.black` has `.user.name` case-insensitively equal to the requested username |
| `user` / `opponent` | `{ username: players.<side>.user.name, rating: players.<side>.rating }` |
| `result` | derive from `winner` + requested-user's color: `winner === undefined` → `'draw'`; `winner === userColor` → `'win'`; else `'loss'` |
| `opening` | `opening.name` directly (no URL-slug decoding needed, unlike Chess.com's `eco` field) |
| `finalFen` | not directly provided by Lichess (confirmed: `GameJson` has no `fen` field, only `initialFen`). This field is actually read (`GameModal.tsx:146`, fallback position when `positions[index]` is out of range), so it must be derived: load `pgn` into a `chess.js` instance and read `.fen()` after playing all moves |
| `clockSnapshots` | `clocks` array (when `clocks=true`): **centiseconds**, one entry per ply. Build one `ClockSnapshot` per position the same way `extractClockSnapshots` does for Chess.com's `%clk` PGN comments — index 0 is the start-of-game snapshot (`clock.initial` for both sides), then each subsequent `clocks[i]` (÷100 for seconds) updates whichever side just moved, carrying the other side forward |

⚠️ **Must verify against a live response before trusting this table.** I could not reach
`lichess.org/api/games/user/{username}` from the research sandbox (it returned 404 even for known-real,
very active accounts — looks like bot/WAF protection on that specific streaming endpoint rather than a
real "not found"; `lichess.org/api/user/{username}` worked fine and confirmed real accounts exist). The
table above is built from Lichess's official OpenAPI spec and example payload, not a live call.
**First implementation step for `lib/lichess/api.ts` must be a real `curl`/fetch against
`https://lichess.org/api/games/user/EmdinMark?max=3&clocks=true&opening=true&pgnInJson=true` with
`Accept: application/x-ndjson`, to confirm field names/shapes match this table before writing the
normalizer against them.** `EmdinMark` is a real, active Lichess account (confirmed via `/api/user/`)
usable for this check.

## UI

- `app/components/ChessComShell/index.tsx` → generalize into `app/components/GamesShell/index.tsx`.
  Takes a `platform: 'chesscom' | 'lichess'` plus the per-platform config (hook, stored-username pair,
  profile-update action) rather than hardcoding Chess.com's. Internally keyed by platform so switching
  is just a state change, no remount of unrelated UI.
- New: a small platform-toggle sub-component, rendered only when both usernames exist for the current
  identity (signed-in profile row or guest's two localStorage keys).
- `app/components/ChessComGames/` and `app/components/LongThinks/` consume `GamesShell` instead of
  `ChessComShell` — their internal rendering (`GameTile`, `LongThinkCard`, `ThresholdSelector`) is
  unchanged, since they already only consume the normalized `Game`/`LongThink` types. `GameModal` needs
  one copy change (see i18n below) — its "View on Chess.com" link must work for both platforms; the
  link's `href` already comes from `game.url`, which both normalizers populate correctly (Chess.com's
  own game page / `https://lichess.org/{id}` respectively), so only the link's **label text** needs to
  become platform-neutral.
- `app/components/ChessComUsernameForm/` → generalize into `app/components/UsernameForm/`, taking a
  `platform: 'chesscom' | 'lichess'` prop that selects the label/placeholder translation key. When
  neither username is saved (`GamesShell`'s empty state), render the same platform-toggle
  sub-component above this form so the user picks which platform they're entering a username for,
  defaulting to `'chesscom'`.
- `app/[locale]/games/page.tsx` and `app/[locale]/think-time/page.tsx` currently `select('chesscom_username')`
  only — change both to `select('chesscom_username, lichess_username')` and pass both down as
  `initialChesscomUsername` / `initialLichessUsername` props.
- New: `lib/lichess/useLichessGames.ts`, mirroring `lib/chesscom/useChessComGames.ts`'s shape and SWR
  settings (`revalidateOnFocus: false`, `revalidateOnReconnect: false`) exactly, with SWR key
  `['lichess-games', username]`.
- New: `lib/lichess/useStoredLichessUsername.ts`, a copy of `lib/chesscom/useStoredUsername.ts` with
  storage key `lichess-username` and its own same-tab event name (so the two don't collide).
- `lib/auth/profileActions.ts` already updates `lichess_username` through the full `/profile` form
  (`updateExternalUsernames`) — reused as-is for that page. But `GamesShell`'s inline "change username"
  flow (used directly on `/games`/`/key-positions`, not the profile page) calls the narrower
  fire-and-forget `updateChesscomUsername(username)`. **Correction found during planning: there is no
  Lichess equivalent of that function.** Add `updateLichessUsername(username: string | null): Promise<void>`
  to `lib/auth/profileActions.ts`, mirroring `updateChesscomUsername` exactly (same no-validation
  reasoning, same guest no-op).

## i18n

New keys, both locales, under existing namespaces (reuse `games.usernameForm.*` namespace structure for
the platform toggle rather than inventing a new one):

```
games.platformToggle.chesscom   // "Chess.com"
games.platformToggle.lichess    // "Lichess"
games.usernameForm.chesscomLabel  // was games.usernameForm.label — rename, Chess.com-specific text
games.usernameForm.lichessLabel   // "Lichess username"
games.modal.viewGame              // was games.modal.viewOnChessCom ("View on Chess.com") — generic
                                   // "View game" text; the link target itself (game.url) already
                                   // resolves correctly per-platform, only the label changes
```

Rename the existing `common.chesscom` namespace (4 keys: `loading`, `errorGeneric`, `errorNotFound`,
`emptyGames`) to `common.games` in both `messages/en.json` and `messages/ru.json`, since it's now
shared by both platforms. Confirmed call sites to update (all via `useTranslations('common.chesscom')`
→ `useTranslations('common.games')`, same key names underneath): `app/components/ChessComShell/index.tsx`
(→ `GamesShell`) uses `loading`, `errorNotFound`, `errorGeneric`; `app/components/ChessComGames/index.tsx`
uses `emptyGames`.

Also genericize the page-level copy that's currently Chess.com-specific text (not structural, just
values — key paths stay the same): `games.title` ("Chess.com Games" → "Games"), `games.subtitle`
("Browse the last 10 games of any Chess.com player." → "Browse your last 10 games on Chess.com or
Lichess."). Checked `thinkTime.title`/`subtitle` ("Key Positions" / "Positions where you spent extra
time thinking...") — already platform-neutral, no change needed there.

## Supabase config

None. `lichess_username` column already exists (`supabase/migrations/20260520194900_initial_schema.sql`),
already editable via the existing profile form and server action.

## Acceptance criteria

- [ ] Live Lichess API response fields verified against the mapping table above (first implementation
      step) — table corrected if reality differs
- [ ] User with only `chesscom_username` saved: Games/Key Positions work exactly as before, no visible
      change, no toggle shown
- [ ] User with only `lichess_username` saved: Games/Key Positions work using Lichess data, no toggle
      shown
- [ ] User with both saved: toggle appears, switching re-fetches and re-renders without navigation
- [ ] Guest (no account) gets the same behavior via two independent localStorage keys
- [ ] Unknown Lichess username shows the same "not found" messaging pattern as an unknown Chess.com
      username
- [ ] `lib/games/longThinks.ts` (moved, unchanged) still passes all existing tests under their new
      import path
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
- [ ] Tests added under `tests/lib/lichess/` and updated under `tests/app/components/` for the renamed
      `GamesShell` and the platform toggle
