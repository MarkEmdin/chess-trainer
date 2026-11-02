# Time-control filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bullet/Blitz/Rapid toggle chips that filter games on `/games` and `/think-time`; daily games never shown.

**Architecture:** A pure filter + a localStorage hook in `lib/games/`. A presentational `TimeClassFilter` chip group. `GamesShell` applies the filter once, so both pages get filtered games and the chips as a `timeFilter` render prop.

**Tech Stack:** Next.js 16, React 19, next-intl, Tailwind v4, lucide-react, Jest + RTL.

**Spec:** `specs/018-time-class-filter.md`

## Global Constraints

- Storage key `games-time-classes`, JSON array; default `['bullet','blitz','rapid']`.
- Strings in `messages/{en,ru}.json` with identical key trees; chip labels reuse `games.tile.timeClass.*`.
- Token colours only; `cn()` for conditional classes.
- `npm run lint` (zero warnings), `npm test`, `npm run build` green at the end.

## Review Focus

1. localStorage holds garbage / `[]` / only `"daily"` → treated as all three (Task 1 test).
2. `useSyncExternalStore` snapshot must be referentially stable, or React loops (Task 1: snapshot is the raw string, parse in `useMemo`).
3. Loaded games exist but none match → chips + message + load-more still visible (Task 3 test).
4. Only one chip on → clicking it does nothing (Task 2 test).
5. Status line counts filtered games, not raw (Task 3 test).

---

### Task 1: Filter helper + stored selection hook

**Files:**
- Create: `lib/games/timeClassFilter.ts`, `lib/games/useStoredTimeClasses.ts`
- Test: `tests/lib/games/timeClassFilter.test.ts`, `tests/lib/games/useStoredTimeClasses.test.ts`

**Interfaces — Produces:**
- `FILTER_TIME_CLASSES: readonly ['bullet','blitz','rapid']`, `type FilterTimeClass`
- `filterByTimeClass(games: Game[], selected: readonly FilterTimeClass[]): Game[]`
- `useStoredTimeClasses(): [FilterTimeClass[], (next: FilterTimeClass[]) => void]`

- [ ] Tests: filter keeps only selected classes; drops `daily` always. Hook: default all three; reads stored array; `'junk'`, `'[]'`, `'["daily"]'` → default; setter persists JSON and syncs a second hook instance.
- [ ] Run `npx jest tests/lib/games/timeClass tests/lib/games/useStoredTime` → FAIL.
- [ ] Implement, mirroring `lib/chesscom/useStoredThreshold.ts`; snapshot returns the raw string (stable), parsing + validation in `useMemo`.
- [ ] Re-run → PASS. Commit `feat: stored time-control selection`.

### Task 2: `TimeClassFilter` chips

**Files:**
- Create: `app/components/TimeClassFilter/index.tsx`
- Test: `tests/app/components/TimeClassFilter/index.test.tsx`

**Interfaces — Produces:** `<TimeClassFilter value={FilterTimeClass[]} onChange={(next) => void} />`

- [ ] Tests: three buttons labelled by `games.tile.timeClass.*` with `aria-pressed`; clicking an on chip calls `onChange` without it; clicking an off chip adds it (order kept as `FILTER_TIME_CLASSES`); with one chip on, clicking it doesn't call `onChange`.
- [ ] FAIL → implement (group labelled by `common.games.timeFilterLabel`; icons: inline SVG bullet, lucide `Zap`, `Timer`; mockup A pill styling with `border-primary bg-primary/15` when on) → PASS. Commit `feat: time-control filter chips`.

### Task 3: Wire into GamesShell, both pages, i18n

**Files:**
- Modify: `app/components/GamesShell/index.tsx`, `app/components/LongThinks/index.tsx`, `app/components/ChessComGames/index.tsx`, `messages/en.json`, `messages/ru.json`
- Test: `tests/app/components/GamesShell/index.test.tsx`, update `tests/app/components/LongThinks/LongThinks.test.tsx` mock

**Interfaces — Consumes:** Tasks 1–2. **Produces:** render prop `timeFilter: React.ReactNode` on `GamesShell` children.

- [ ] Tests (GamesShell): bullet game hidden after turning bullet off in stored selection; `renderStatus` receives filtered games; all loaded games filtered out → `common.games.emptyFiltered` text, chips and load-more shown, children not called; daily game never reaches children.
- [ ] FAIL → implement: filter raw games before status/children; "nothing matches" branch rendered by the shell; `LongThinks` places `{timeFilter}` under `ThresholdSelector`; `ChessComGames` above `GamesList`. Add `timeFilterLabel`, `emptyFiltered` to `common.games` in both locales.
- [ ] `npm test`, `npm run lint`, `npm run build` → green. Commit `feat: filter games by time control on both pages`.
