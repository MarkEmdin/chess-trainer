# Spec: filter games by time control

Status: in-progress
Branch: feature/time-class-filter

## Problem

Key Positions (`/think-time`) and the games list (`/games`) show every game the user played. Someone who plays bullet for fun but doesn't want to analyse it has to scroll past those positions. Daily (correspondence) games show up too, though long thinks there mean nothing.

## Goal

Three toggle chips — Bullet, Blitz, Rapid — each with an icon and label. Only games of the selected time controls show on both pages. Daily games never show.

## Non-goals

- Server-side filtering or storing the choice in the user profile.
- Filtering inside the coaching admin pages.
- Changing how Lichess speeds map to time classes (classical → rapid, ultraBullet → bullet stays).

## User-facing behavior

- Chips sit under the threshold selector on `/think-time` and above the list on `/games` (mockup A, see brainstorm).
- Multi-select; all three on by default. The last selected chip can't be turned off.
- One choice shared by both pages, kept in localStorage (survives reloads, syncs between tabs).
- Status line and the asked/unasked tab counts count only the shown games.
- If loaded games exist but none match the chosen time controls: chips stay visible, a message says nothing matches, and "Load more" stays available.
- Daily games are dropped everywhere, with no chip for them.

## Data & types

- `lib/games/timeClassFilter.ts`: `FILTER_TIME_CLASSES = ['bullet','blitz','rapid']`, `filterByTimeClass(games, selected)`.
- `lib/games/useStoredTimeClasses.ts`: `useSyncExternalStore` + localStorage, key `games-time-classes`, JSON array. Invalid/empty value → all three.

## UI

- `app/components/TimeClassFilter/index.tsx` (client): chip group, `aria-pressed` toggles; icons — custom SVG bullet, lucide `Zap` (blitz), `Timer` (rapid).
- `GamesShell` owns the filtering: reads the hook, filters games before `renderStatus`/`children`, hands the chips to children as `timeFilter`, handles the "nothing matches" case itself.

## i18n

- `common.games.timeFilterLabel` — "Time controls" / "Режимы"
- `common.games.emptyFiltered` — "No games with the selected time controls in the loaded games." / "В загруженных партиях нет партий выбранных режимов."
- Chip labels reuse `games.tile.timeClass.*`.

## Acceptance criteria

- [ ] Turning a chip off hides its games on `/games` and its positions on `/think-time`
- [ ] Choice persists across reload and is shared between the pages
- [ ] Last selected chip can't be turned off
- [ ] Daily games never show
- [ ] Nothing-matches state keeps chips and load-more visible
- [ ] `npm run lint`, `npm test`, `npm run build` pass
