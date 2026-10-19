# Spec: Load more games

Status: done
Branch: feature/load-more-games

## Problem

`/games` and `/think-time` (Key Positions) load a fixed batch of the user's 50 most recent games
(`GAMES_LIMIT` in `lib/games/constants.ts`). There is no way to look further back. For Key Positions
this caps the analysis: a user who wants to find long thinks from last month's games simply can't
reach them. Separately, the threshold picker on `/think-time` is a loose row of five buttons that
wraps awkwardly on phones, and neither page has been checked on a phone-sized screen since Lichess
support landed.

## Goal

- Under the games list (on `/games`) and under the long-think cards (on `/think-time`) there is a
  "Load more games" button. Each click appends the next 50 older games for the active platform.
  The button disappears once the player has no older games.
- Key Positions re-runs long-think detection over everything loaded so far, so loading more games
  can surface more cards.
- The threshold picker becomes one connected segmented control that fits on a single row at 320 px.
- Both pages work at phone width (375 px, and nothing breaks at 320 px): no horizontal page scroll,
  no clipped or overlapping controls, the game modal is usable.

## Non-goals

- Filters by time control, date, result, or opponent. Explicitly deferred until user feedback
  arrives — do not add any filtering UI or API parameters.
- Infinite scroll / auto-loading on scroll. Loading is always an explicit click.
- Changing the threshold presets (stay 15 / 30 / 45 / 60 / 90 s, default 45) or how the threshold
  is stored (`useStoredThreshold` unchanged).
- Persisting how many pages were loaded across reloads. A reload starts again at the first 50.
- Mixing both platforms into one list (still rejected, see spec 002).

## User-facing behavior

### Load more

1. The first page loads as today: 50 games, same loading spinner, same errors (not found / generic).
2. When the first page has 50 games, a "Load more games" / "Загрузить ещё партии" button appears
   below the content, inside `GamesShell`, so both pages get it identically.
   - On `/think-time` the button shows even if the loaded games contain zero long thinks — that is
     exactly when the user wants to dig further back.
3. Clicking it: the button becomes disabled and shows a spinner; already-loaded games stay on
   screen and stay clickable. When the page arrives, the new games are appended at the bottom
   (`/games`) or merged into the long-think results (`/think-time`).
4. The status line updates its count, e.g. "Showing the last 100 games of EmdinMark".
5. When a page comes back with fewer than 50 games, there's nothing older — the button disappears
   for good (until the username or platform changes).
6. If loading a further page fails, the loaded games stay; below them show
   "Couldn't load more games." / "Не удалось загрузить ещё партии." with a "Retry" / "Повторить"
   button that re-requests the same page. The "Load more" button is hidden while this error shows.
7. Switching platform (toggle) or changing user resets to the first page of the new
   platform/username. Switching back to a platform already viewed in this session may show its
   previously loaded pages from cache — that's fine.
8. Edge: a player with exactly 50 (or 100, …) games sees the button once more; clicking it returns
   zero games and the button disappears. Acceptable.

### Threshold picker

- Same label ("Threshold" / "Порог"), same five values, same default and persistence.
- Rendered as one connected segmented control (shared border, no gaps; selected segment uses the
  primary token, others outline/muted) instead of five separate buttons.
- Fits in one row at 320 px width, label included (label may sit above the control on narrow
  screens if needed).
- Remains keyboard-accessible; the selected value is exposed to assistive tech (keep the existing
  `ThresholdSelector` tests' intent: each preset findable by its "15s"… name, active one marked).

### Mobile pass

Check `/en/games` and `/en/think-time` at 375 px and 320 px, guest and signed-in, both platforms:

- Platform toggle, username form (input + submit button), status line + "Change user" row,
  game tiles, long-think cards, threshold picker, load-more button and error row.
- Game modal: board fits the viewport width, move navigation buttons reachable without horizontal
  scroll, "View game" link visible.
- Fix whatever overflows, clips or overlaps. "Load more" is full-width on small screens.
- Record what was found and fixed in the PR description (no screenshots required).

## Data & types

### API layer (`lib/chesscom/api.ts`, `lib/lichess/api.ts`)

Replace `fetchLastGames(username, limit, signal)` with a paged function on each platform:

```ts
// lib/games/types.ts
export type GamesPage = {
  games: Game[];
  // Opaque, platform-specific cursor for the next (older) page; null when there are no more games.
  nextCursor: number | null;
};

fetchGamesPage(username: string, cursor: number | null, limit: number, signal?: AbortSignal): Promise<GamesPage>
```

- **Lichess:** pass `until=<cursor>` when the cursor is non-null (Lichess filters by game
  `createdAt`, ms epoch; treat `until` as possibly inclusive). `nextCursor` = the last returned raw
  game's `createdAt - 1`, so the boundary game can't repeat, but only when the page is full
  (`games.length === limit`); otherwise `null`. Builder's call: if live testing shows a duplicate
  anyway, also de-duplicate by `Game.id` when flattening pages in the hook. Note the cursor must come from
  the raw `createdAt`, **not** from `Game.endTime` (which is `lastMoveAt`).
- **Chess.com:** cursor = `end_time` in ms of the oldest game returned so far. A next page walks
  archives from the newest month that could still contain games older than the cursor (archive URLs
  end in `/YYYY/MM`, so months entirely newer than the cursor are skipped without fetching), keeps only
  games with `end_time * 1000 < cursor`, and otherwise reuses the existing backward walk, including
  the `MAX_MONTH_FETCHES` cap **per page**. `nextCursor` = the oldest collected game's `end_time * 1000`
  when the page is full, else `null`. Two games with the same `end_time` second straddling a page
  boundary would lose one — acceptable.
- `PlayerNotFoundError` behavior unchanged.
- Existing `fetchLastGames` tests are migrated to `fetchGamesPage` (cursor `null` = old behavior)
  plus new cursor tests. Delete `fetchLastGames` once nothing uses it.

### Hooks (`lib/chesscom/useChessComGames.ts`, `lib/lichess/useLichessGames.ts`)

Switch from `useSWR` to `useSWRInfinite` (`swr/infinite`).

- Key: `['chesscom-games', username, cursor]` / `['lichess-games', username, cursor]`; first page
  cursor is `null`; `getKey` returns `null` (stop) when the previous page's `nextCursor` is `null`.
- Options: `revalidateOnFocus: false`, `revalidateOnReconnect: false`, **`revalidateFirstPage: false`**
  (otherwise every "load more" refetches page 1).
- Result shape grows (both hooks identical):

```ts
{
  games: Game[] | null;      // all loaded pages flattened, newest first; null before page 1 arrives
  error: Error | null;       // first-page error only (drives the existing error branch)
  isLoading: boolean;        // first page loading
  isNotFound: boolean;
  hasMore: boolean;          // last loaded page had a non-null nextCursor
  isLoadingMore: boolean;    // a page beyond the first is in flight
  loadMoreError: Error | null; // a page beyond the first failed
  loadMore: () => void;      // request next page; also used as Retry after loadMoreError
}
```

- Page size stays `GAMES_LIMIT` (50).
- No new server actions or API routes.

## UI

- `app/components/GamesShell/index.tsx` — renders the load-more button / spinner / error+retry
  below `children(...)`, whenever `games.length > 0`. Uses the active platform's hook result.
  Single component; no new folder needed unless the load-more row grows past ~40 lines, in which
  case extract `app/components/LoadMoreGames/index.tsx`.
- `app/components/LongThinks/ThresholdSelector.tsx` — segmented-control restyle (Client, already).
- Mobile fixes wherever the pass finds them (Tailwind responsive classes; semantic tokens only).
- All touched components are already `'use client'`.

## i18n

New keys, both locales, under the existing `games` namespace (shared by both pages via `GamesShell`):

```
games.loadMore.button   // "Load more games"            / "Загрузить ещё партии"
games.loadMore.error    // "Couldn't load more games."  / "Не удалось загрузить ещё партии."
games.loadMore.retry    // "Retry"                       / "Повторить"
```

Copy that states a fixed count must stop doing so:

```
lessons.games.description // "Browse and replay the recent games of any Chess.com or Lichess player."
                        // "Смотрите и переигрывайте недавние партии любого игрока Chess.com или Lichess."
games.subtitle          // "Browse your recent games on Chess.com or Lichess."
                        // "Недавние партии на Chess.com или Lichess."
thinkTime.empty         // "No moves crossed the {threshold}s threshold in the loaded games."
                        // "В загруженных партиях нет ходов с думой от {threshold} с."
```

Also drop the "keep them in sync" note in `lib/games/constants.ts` once no copy states the number.

## Acceptance criteria

- [ ] Lichess: page 2 request carries `until=<createdAt of page 1's last raw game − 1>`; page with < 50 games → `nextCursor: null`
- [ ] Chess.com: page 2 contains only games strictly older than page 1's oldest; months newer than the cursor are not fetched; partial page → `nextCursor: null`
- [ ] Hooks: "load more" appends without refetching page 1; `hasMore` false after a short page; a failing page 2 keeps page 1's games and sets `loadMoreError`; `loadMore()` after that retries
- [ ] `GamesShell`: button shown only when `hasMore`; disabled + spinner while loading more; error row with Retry; button hidden while error shows
- [ ] `/think-time`: load-more visible even with zero long thinks; newly loaded games feed long-think detection
- [ ] Status line count reflects all loaded games
- [ ] Threshold picker is one segmented control, one row at 320 px, existing behavior/persistence intact
- [ ] Mobile pass done at 375 px and 320 px for both pages + game modal; findings listed in PR
- [ ] No user-facing copy states "50"
- [ ] `npm test` green, `npm run lint` zero warnings, `npm run build` passes
- [ ] Tests under `tests/` mirroring paths for API paging, both hooks, `GamesShell` load-more states, `ThresholdSelector`
