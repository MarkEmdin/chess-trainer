# Simple First Visit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guest enters their nickname on the landing and lands on their positions; every empty case offers one next step; old games get a "think about it now" hint.

**Architecture:** Pure helpers in `lib/games/` (age, lower threshold). `GamesShell` owns not-found / no-games blocks for both `/games` and `/think-time`. `LongThinks` owns the no-thinks block. A small client form on the server-rendered landing writes the existing localStorage nickname stores and navigates.

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind v4 tokens, Jest + RTL.

**Spec:** `specs/036-first-visit.md`

## Global Constraints

- No new visual style: existing tokens, `Button`, `Input`, `buttonVariants`, spacing as on today's pages.
- All copy through next-intl; `messages/en.json` and `ru.json` keep identical key trees.
- Navigation via `@/i18n/navigation`, never `next/navigation`.
- Thresholds: presets `[15, 30, 45, 60, 90]`, default unchanged (45).
- "Old" = game ended more than 7 days ago.

## Review Focus

- Nickname with spaces around it on the landing → trimmed before saving.
- Signed-in user hitting "search on the other platform" → profile updated (server action), not localStorage.
- Threshold already 15 with no thinks → no "show lower" button, the "play rapid" message instead.
- Time-class chips hiding every game → existing filter notice still wins over the no-thinks block.
- Game exactly 7 days old → not "old" (strictly more than 7 days).

---

### Task 1: Pure helpers

**Files:**
- Create: `lib/games/age.ts`
- Modify: `lib/games/constants.ts`, `lib/games/longThinks.ts`, `app/components/LongThinks/ThresholdSelector.tsx` (import presets)
- Test: `tests/lib/games/age.test.ts`, `tests/lib/games/longThinks.test.ts`

**Interfaces:**
- Produces: `THRESHOLD_PRESETS: readonly [15, 30, 45, 60, 90]` in `lib/games/constants.ts`; `isOldGame(endTime: Date, now: Date): boolean`; `lowerThresholdWithThinks(games: Game[], threshold: number, presets?: readonly number[]): number | null` (defaults to `THRESHOLD_PRESETS`).

- [ ] Tests: `isOldGame` false at exactly 7 days, true at 7 days + 1 ms, false for today. `lowerThresholdWithThinks` returns highest preset below threshold with ≥1 think (games with thinks of 20 s and 35 s, threshold 45 → 30); `null` when none; `null` when threshold is 15.
- [ ] Run, see fail; implement (reuse `collectLongThinks`); run, see pass.
- [ ] Commit `feat: helpers for old games and lower threshold`.

### Task 2: GamesShell not-found and no-games blocks

**Files:**
- Modify: `app/components/GamesShell/index.tsx`, `app/components/ChessComGames/index.tsx`, `app/components/LongThinks/index.tsx` (drop `emptyMessage`), `messages/{en,ru}.json`
- Test: `tests/app/components/GamesShell/index.test.tsx`

**Interfaces:**
- Produces: `GamesShell` without the `emptyMessage` prop. Keys `common.games.notFound {username, platform}`, `common.games.tryOther {username, platform}`, `common.games.noGames {username}`, `common.games.playChesscom`, `common.games.playLichess`; removes `errorNotFound`, `emptyGames`.

- [ ] Tests: not-found shows text with the nickname and a button "Search alice on Lichess"; clicking it calls the lichess hook with `alice` and the chess.com hook with `null`; for a signed-in user it calls `updateLichessUsername('alice')` and `updateChesscomUsername(null)`. No games shows `noGames` text and links to `https://www.chess.com/play/online` and `https://lichess.org/`.
- [ ] Run, fail; implement `switchPlatform()` next to `setUsername` (set other platform's username, clear current, `setEditingPlatform(null)`); run, pass.
- [ ] Commit `feat: next step when a nickname has no games`.

### Task 3: LongThinks no-thinks block

**Files:**
- Modify: `app/components/LongThinks/index.tsx`, `messages/{en,ru}.json`
- Test: `tests/app/components/LongThinks/LongThinks.test.tsx`

**Interfaces:**
- Consumes: `lowerThresholdWithThinks`. Keys `thinkTime.showLower {seconds}`, `thinkTime.noThinks`.

- [ ] Tests: threshold 45, only a 20 s think → `empty` text + button "Show moves from 15 s"; clicking shows the row. No thinks at any preset → `noThinks` text, no button. Existing filter-notice test still passes.
- [ ] Run, fail; implement; run, pass.
- [ ] Commit `feat: offer a lower threshold when nothing qualifies`.

### Task 4: Old-game hint and writing label

**Files:**
- Modify: `app/components/LongThinks/PositionDetail.tsx`, `messages/{en,ru}.json` (`thinkTime.oldGame`, `coaching.bodyLabel`)
- Test: `tests/app/components/LongThinks/PositionDetail.test.tsx`

- [ ] Tests: game ended 30 days ago → `oldGame` text visible; ended today → absent.
- [ ] Run, fail; implement with `isOldGame(game.endTime, new Date())`, muted `text-xs text-muted-foreground` line above the ask button; run, pass.
- [ ] Commit `feat: hint to think about old positions now`.

### Task 5: Landing

**Files:**
- Create: `app/components/LandingNickForm/index.tsx`
- Modify: `app/[locale]/page.tsx`, `messages/{en,ru}.json`
- Test: `tests/app/components/LandingNickForm/index.test.tsx`, `tests/app/page.test.tsx`

**Interfaces:**
- Produces: `LandingNickForm` (no props). Keys `home.form.submit`, `home.form.placeholder`; rewritten `home.subhead`, `home.howItWorks.*.text`; removes `home.ctaPrimary`, `home.features`, `home.future`.

- [ ] Tests (form): submit disabled on empty; typing `  alice ` + Enter saves `alice` to the chess.com store and pushes `/think-time`; switching to Lichess saves to the lichess store and clears a saved chess.com nickname.
- [ ] Tests (page): form rendered; no feature card links; no `home.future.title`; three steps and demo still present. Drop obsolete card / future / ctaPrimary tests.
- [ ] Run, fail; implement; run, pass.
- [ ] Commit `feat: nickname field on the landing`.

### Task 6: Verify

- [ ] `npm test`, `npm run lint`, `npm run build` all pass.
- [ ] Look at `/`, `/think-time` (not-found nick, empty account) in the browser, phone width and desktop.
