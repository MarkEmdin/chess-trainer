# Load More Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Load more games" button on `/games` and `/think-time` that appends the next 50 older games per click, plus a segmented threshold picker and a phone-width pass.

**Architecture:** Each platform API gets a cursor-paged `fetchGamesPage(username, cursor, limit, signal)` returning `{ games, nextCursor }`. One generic `useGamesPages` hook (SWR `useSWRInfinite`) turns any page fetcher into the shell-facing result; `useChessComGames` / `useLichessGames` become thin wrappers. `GamesShell` renders the load-more row for both pages.

**Tech Stack:** Next.js 16, React 19, SWR 2.4 (`swr/infinite`), next-intl, Tailwind v4, Jest + RTL.

**Spec:** `specs/003-load-more-games.md`

## Global Constraints

- Page size: `GAMES_LIMIT = 50` (`lib/games/constants.ts`), unchanged.
- SWR options for every games hook: `revalidateOnFocus: false`, `revalidateOnReconnect: false`, `revalidateFirstPage: false`.
- SWR keys: `['chesscom-games', username, cursor]` / `['lichess-games', username, cursor]`, first page `cursor = null`.
- Threshold presets stay `15 / 30 / 45 / 60 / 90`, default 45, `useStoredThreshold` untouched.
- No filters, no infinite scroll, no persisted page count.
- Semantic Tailwind tokens only; `cn()` for conditional classes; no user-facing copy states "50".
- `npm run lint` zero warnings; `npm run build` passes.

## Review Focus

1. Lichess `until` inclusivity — boundary game must not appear twice across pages (cursor = `createdAt - 1`; hook also de-dupes by `id`). Test in Task 3.
2. Switching platform/username mid-pagination must reset to page 1 of the new key, never show the other user's pages. Test in Task 3.
3. A failing page 2 must not blank page 1 or flip the shell into its first-page error branch. Tests in Tasks 3 and 4.
4. Chess.com cursor inside a month: games in the boundary month that are newer than or equal to the cursor are skipped, older ones kept. Test in Task 2.
5. `/think-time` with zero long thinks in loaded games still shows the button. Test in Task 4.

---

### Task 1: Lichess paged fetch

**Files:**
- Modify: `lib/games/types.ts` (add `GamesPage`)
- Modify: `lib/lichess/api.ts` (`fetchLastGames` → `fetchGamesPage`)
- Test: `tests/lib/lichess/api.test.ts` (migrate all existing cases to `fetchGamesPage('x', null, 10)`)

**Interfaces:**
- Produces: `export type GamesPage = { games: Game[]; nextCursor: number | null }` in `lib/games/types.ts`
- Produces: `fetchGamesPage(username: string, cursor: number | null, limit: number, signal?: AbortSignal): Promise<GamesPage>` in `lib/lichess/api.ts`

- [ ] **Step 1: Write failing tests** (add to the migrated suite)
  - `omits until on the first page`: cursor `null` → fetched URL does not contain `until=`.
  - `passes until for later pages`: cursor `1_700_000_000_000` → URL contains `until=1700000000000`.
  - `returns nextCursor = last createdAt - 1 when the page is full`: limit 2, two raw games with `createdAt` 2000 and 1000 → `nextCursor === 999`.
  - `returns nextCursor null on a short page`: limit 3, two games → `nextCursor === null`.
  - Existing assertions become `(await fetchGamesPage(...)).games`.
- [ ] **Step 2: Run** `npm test -- tests/lib/lichess/api.test.ts` — Expected: FAIL, `fetchGamesPage` is not exported.
- [ ] **Step 3: Implement.** Add `cursor` to the URL builder (`&until=${cursor}` only when non-null); compute `nextCursor` from the last raw game before normalizing. Replace `fetchLastGames` with a temporary one-line wrapper `(u, l, s) => fetchGamesPage(u, null, l, s).then((p) => p.games)` so `useLichessGames` still compiles; Task 3 deletes it.
- [ ] **Step 4: Run** same command plus `npx tsc --noEmit` — Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat: cursor-paged Lichess games fetch`

### Task 2: Chess.com paged fetch

**Files:**
- Modify: `lib/chesscom/api.ts`
- Test: `tests/lib/chesscom/api.test.ts` (migrate existing cases to `fetchGamesPage('x', null, 10)`, keep the `limit 3` walk-back case with limit 3)

**Interfaces:**
- Consumes: `GamesPage` (Task 1)
- Produces: `fetchGamesPage(username: string, cursor: number | null, limit: number, signal?: AbortSignal): Promise<GamesPage>`; cursor is `end_time * 1000` (ms)

- [ ] **Step 1: Write failing tests**
  - `returns nextCursor = oldest end_time in ms when the page is full`: limit 2, May archive with games `end_time` 100, 200 → `nextCursor === 100_000`.
  - `returns nextCursor null when archives are exhausted`: limit 5, one archive with 2 games → `null`.
  - `skips games at or after the cursor inside the boundary month`: cursor `200_000`, May archive games `end_time` 100, 200, 300 → result ids are only the 100 one.
  - `does not fetch months newer than the cursor`: archives `2026/04`, `2026/05`; cursor = `Date.UTC(2026, 3, 20)` (April) → fetch called with archives URL then the `/2026/04` URL only (assert `mock.mock.calls[1][0]` ends with `/2026/04` and call count is 2).
- [ ] **Step 2: Run** `npm test -- tests/lib/chesscom/api.test.ts` — Expected: FAIL, `fetchGamesPage` not exported.
- [ ] **Step 3: Implement.** When cursor is non-null: drop archives whose `/YYYY/MM` suffix (parse last two path segments) is later than the cursor's UTC year/month before walking; filter each month's games to `end_time * 1000 < cursor`. `MAX_MONTH_FETCHES` applies per call. Keep a temporary `fetchLastGames` wrapper like Task 1.
- [ ] **Step 4: Run** same command plus `npx tsc --noEmit` — Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat: cursor-paged Chess.com games fetch`

### Task 3: Generic paged hook + platform wrappers

**Files:**
- Create: `lib/games/useGamesPages.ts`
- Modify: `lib/chesscom/useChessComGames.ts`, `lib/lichess/useLichessGames.ts` (become wrappers; delete their own `UseXGamesResult` types in favor of the shared one)
- Modify: `lib/chesscom/api.ts`, `lib/lichess/api.ts` (delete temporary `fetchLastGames`)
- Delete: `tests/lib/games/gamesLimit.test.ts` (superseded)
- Test: `tests/lib/games/useGamesPages.test.ts`

**Interfaces:**
- Produces in `lib/games/useGamesPages.ts`:
  ```ts
  export type UseGamesResult = {
    games: Game[] | null; error: Error | null; isLoading: boolean; isNotFound: boolean;
    hasMore: boolean; isLoadingMore: boolean; loadMoreError: Error | null; loadMore: () => void;
  };
  export type GamesPageFetcher = (username: string, cursor: number | null, limit: number) => Promise<GamesPage>;
  export function useGamesPages(keyPrefix: 'chesscom-games' | 'lichess-games', username: string | null, fetchPage: GamesPageFetcher): UseGamesResult;
  ```
- Produces: `useChessComGames(username): UseGamesResult`, `useLichessGames(username): UseGamesResult` (same names, so `GamesShell`'s mocks keep working).

- [ ] **Step 1: Write failing tests** (render with `<SWRConfig value={{ provider: () => new Map() }}>` wrapper so each test has a fresh cache; fetcher is a `jest.fn`)
  - `loads the first page with cursor null and GAMES_LIMIT`: fetcher called with `('alice', null, 50)`; `games` length matches; `hasMore` true when `nextCursor` non-null.
  - `appends the next page without refetching page 1`: page 1 `{games:[a], nextCursor: 10}`, page 2 `{games:[b], nextCursor: null}` → after `act(loadMore)`, `games` ids `['a','b']`, fetcher called exactly twice, second call `('alice', 10, 50)`, `hasMore` false.
  - `de-duplicates games by id across pages`: page 2 repeats `a` → ids `['a','b']`.
  - `keeps page 1 and sets loadMoreError when page 2 fails`: page 2 rejects → `games` ids `['a']`, `error` null, `loadMoreError` set, `isLoadingMore` false; calling `loadMore()` again re-requests cursor 10 and on success clears `loadMoreError`.
  - `reports first-page failures through error/isNotFound`: rejects with `PlayerNotFoundError` → `isNotFound` true, `loadMoreError` null.
  - `resets to page 1 when the username changes`: rerender with `'bob'` after loading 2 pages for alice → fetcher's next call is `('bob', null, 50)` and `games` contain only bob's.
  - `does nothing when username is null`: fetcher never called, `games` null, `hasMore` false.
- [ ] **Step 2: Run** `npm test -- tests/lib/games/useGamesPages.test.ts` — Expected: FAIL, module not found.
- [ ] **Step 3: Implement** with `useSWRInfinite` (`getKey(i, prev)`: `null` if no username or `prev?.nextCursor === null`; else `[keyPrefix, username, i === 0 ? null : prev.nextCursor]`). Derivations: `error` = SWR error only while `data` has no pages; `loadMoreError` = SWR error once ≥1 page loaded; `isLoadingMore` = `size > (data?.length ?? 0)` and no error; `loadMore` = if `loadMoreError` then `mutate()` re-validating the failed page (call `setSize(size)` fallback if `mutate` alone doesn't retry — pick whichever the test proves), else `setSize(size + 1)`. Flatten pages, de-dupe by `id` preserving first occurrence. Options per Global Constraints. Rewire the two platform hooks; delete temp `fetchLastGames`.
- [ ] **Step 4: Run** `npm test` (whole suite, GamesShell tests must still pass with the wider result type — update `idleResult()` in `tests/app/components/GamesShell/index.test.tsx` to include `hasMore:false, isLoadingMore:false, loadMoreError:null, loadMore: jest.fn()`) and `npx tsc --noEmit` — Expected: all PASS, no type errors.
- [ ] **Step 5: Commit** `feat: paginate games hooks with useSWRInfinite`

### Task 4: Load-more row in GamesShell + copy

**Files:**
- Modify: `app/components/GamesShell/index.tsx`
- Modify: `messages/en.json`, `messages/ru.json` (new `games.loadMore.*` keys + count-free copy, exact strings in spec §i18n)
- Modify: `lib/games/constants.ts` (drop the "keep them in sync" sentence)
- Test: `tests/app/components/GamesShell/index.test.tsx`

**Interfaces:**
- Consumes: `UseGamesResult` (Task 3)

- [ ] **Step 1: Write failing tests** (chesscom saved as `alice`, mocks return one game unless stated)
  - `shows load more when hasMore`: button `/load more games/i` present; click calls the mock's `loadMore`.
  - `hides load more when hasMore is false`.
  - `disables load more while loading more`: `isLoadingMore: true` → button disabled.
  - `shows the load-more error with retry and hides the button`: `loadMoreError: new Error()` → text `/couldn't load more games/i`, `/retry/i` button calls `loadMore`, no `/load more games/i` button, and the game content (`children`) still renders.
  - `shows load more even when children render nothing`: children `() => null`, `hasMore: true` → button present.
  - `status line counts all loaded games`: three games → `renderStatus` receives 3 (existing `status-${n}` pattern → `status-3`).
- [ ] **Step 2: Run** `npm test -- tests/app/components/GamesShell` — Expected: the new cases FAIL.
- [ ] **Step 3: Implement** the row below `children(...)` when `games.length > 0`: error text (`text-destructive`) + outline Retry button, else the Load more button (`variant="outline"`, `w-full sm:w-auto`, `Loader2Icon` spinner while `isLoadingMore`). Apply the copy changes in both locale files.
- [ ] **Step 4: Run** `npm test` and the en/ru key-structure check:
  `node -e "const en=require('./messages/en.json'),ru=require('./messages/ru.json');const k=o=>JSON.stringify(Object.keys(o).sort());const w=(a,b,p)=>{if(k(a)!==k(b))throw new Error(p);for(const x in a)if(typeof a[x]==='object')w(a[x],b[x],p+'.'+x)};w(en,ru,'root');console.log('OK')"` — Expected: PASS and `OK`; `grep -n "50" messages/*.json` shows no game-count copy.
- [ ] **Step 5: Commit** `feat: load more games button in GamesShell`

### Task 5: Segmented threshold picker

**Files:**
- Modify: `app/components/LongThinks/ThresholdSelector.tsx`
- Test: `tests/app/components/LongThinks/ThresholdSelector.test.tsx`

**Interfaces:** props unchanged `{ value: number; onChange: (next: number) => void }`.

- [ ] **Step 1: Update tests** to the segmented semantics: container `getByRole('radiogroup', { name: /threshold/i })`; each preset `getByRole('radio', { name: '15s' })` …; active one `aria-checked="true"`, others `"false"`; clicking `30s` calls `onChange(30)`.
- [ ] **Step 2: Run** `npm test -- tests/app/components/LongThinks/ThresholdSelector.test.tsx` — Expected: FAIL (no radiogroup).
- [ ] **Step 3: Implement**: label element with an id, `role="radiogroup"` + `aria-labelledby`, plain `<button type="button" role="radio" aria-checked>` segments inside one `inline-flex rounded-md border border-border overflow-hidden` wrapper, selected `bg-primary text-primary-foreground`, others `bg-background hover:bg-muted`, `divide-x divide-border`; label stacks above on narrow screens (`flex-col sm:flex-row`). Arrow-key navigation not required.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: segmented threshold picker`

### Task 6: Mobile pass

**Files:** whichever components the pass flags (expected candidates: `GameTile`, `LongThinkCard`, `GameModal`, `GamesShell` status row, `UsernameForm`).

- [ ] **Step 1:** With the dev server running, open `/en/games` and `/en/think-time` at 375×812 and 320×640 (Chrome automation if available, otherwise audit the Tailwind classes of each listed component for fixed widths, `whitespace-nowrap`, missing `flex-wrap`/`min-w-0`, and board sizing). Cover: platform toggle, username form, status + Change user row, tiles/cards, threshold picker, load-more row, game modal (board, nav buttons, View game link).
- [ ] **Step 2:** For each problem, fix with responsive Tailwind classes; if a fix changes behavior (not just layout), add a test first.
- [ ] **Step 3: Run** `npm test`, `npm run lint`, `npm run build` — Expected: all pass.
- [ ] **Step 4:** Write the findings list (component → problem → fix) into the ledger for the PR description.
- [ ] **Step 5: Commit** `fix: phone-width layout for games and key positions`
