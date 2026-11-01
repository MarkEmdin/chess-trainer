# Dark redesign around Key Positions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one dark design built around a two-column Key Positions screen, with the piece-value trainer removed and every other page restyled through shared tokens.

**Architecture:** Part 1 changes global pieces (theme tokens, header, nav) so every page shifts at once. Part 2 rebuilds `LongThinks` as list + detail from small components. Part 3 sweeps the remaining pages for hardcoded colours, adds the landing redirect and does a visual pass.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (`app/globals.css`), shadcn/ui, next-intl, next-themes, react-chessboard 5, Jest + RTL.

**Spec:** `specs/017-redesign.md` (mockup `specs/assets/017-positions-mockup.html`)

## Global Constraints

- The board stays `ChessboardWithNotation` / react-chessboard with its default colours and pieces; only an opt-out for coordinates is added.
- No migrations, no new data, no new sort orders or filters.
- Every user-facing string goes through next-intl; `messages/en.json` and `messages/ru.json` keep the same key tree.
- Colours only via tokens (`bg-card`, `text-muted-foreground`, `bg-primary`, `text-info`…); no new hex values in components.
- Locale-aware `Link` / `usePathname` / `redirect` come from `@/i18n/navigation`.
- Avoid `asChild` on new Radix triggers (`.claude/rules/known-issues.md`).
- After each part: `npm run lint` (zero warnings), `npm test`, `npm run build` all green before the next part starts.

## Review Focus

1. A signed-in user with no saved username lands on `/think-time` → sees the username form, not an empty two-column frame. (Test in Task 8.)
2. The filter or threshold changes so the selected position disappears → the first visible row becomes selected; an empty list shows the empty message, never a stale detail panel. (Test in Task 8.)
3. Opening a thread with an unseen answer from the detail panel → `markResponseSeen` is called once, as today. (Test in Task 8.)
4. Mobile: the bottom tab bar must not cover the last row or the load-more button → body has bottom padding under `sm`. (Checked in Task 3 test via class + Task 11 manual pass.)
5. A guest (no auth) → detail panel shows the sign-in hint and "Open the whole game", never the coach button. (Test in Task 7.)

---

## Part 1. Clean-up and dark base

### Task 1: Delete the piece-value trainer

**Files:**
- Delete: `app/[locale]/lessons/piece-values/`, `app/components/PieceValuesTraining/`, `tests/app/components/PieceValuesTraining/`, `app/constants/chessPieces.ts` (after confirming no other importer)
- Modify: `app/[locale]/lessons/page.tsx`, `app/components/Header/index.tsx` (drop the link; Task 3 rewrites the list anyway), `messages/en.json`, `messages/ru.json`
- Test: `tests/app/lessons/page.test.tsx` (new)

- [ ] **Step 1: Write the failing test** `tests/app/lessons/page.test.tsx`, mocking `next-intl/server` and `@/i18n/navigation` like `tests/app/page.test.tsx`:
  - `it('lists only theory and world champions')`: `render(await LessonsPage())`; links have hrefs exactly `['/lessons/theory', '/lessons/world-champions']`.
- [ ] **Step 2:** `npx jest tests/app/lessons` → FAIL (5 links).
- [ ] **Step 3:** In `lessons/page.tsx` set `items` to theory and worldChampions only. Delete the files listed above. In both message files remove `nav.pieceValues`, `lessons.pieceValues`, `lessons.games`, `lessons.thinkTime`, the whole `pieceValues` namespace, and rewrite `home.features.lessons.description` without piece values (en: "Theory and world champions. Currently in Russian only." / ru: "Теория и чемпионы мира. Пока только на русском.").
- [ ] **Step 4:** `npx jest tests/app/lessons` → PASS. Then `git grep -n -i -E "piece-?values|PieceValues|chessPieces" -- . ':!specs'` → no output.
- [ ] **Step 5: Commit** `refactor: remove the piece-value trainer`

### Task 2: Single dark theme

**Files:**
- Modify: `app/[locale]/layout.tsx`, `app/globals.css`
- Delete: `app/components/ThemeToggle/` (its only user, MobileNav, goes in Task 3; remove the import there now so the build stays green)

- [ ] **Step 1:** `ThemeProvider` props become `attribute="class" forcedTheme="dark" defaultTheme="dark" themes={['dark']} enableSystem={false} disableTransitionOnChange`.
- [ ] **Step 2:** In `globals.css` delete the `.rose` block. Replace the `.dark` values (keep every variable name):
  `--background:#0f1115; --foreground:#e8eaed; --card:#171a20; --card-foreground:#e8eaed; --popover:#171a20; --popover-foreground:#e8eaed; --primary:#6fcf97; --primary-foreground:#0b1a12; --secondary:#1d2129; --secondary-foreground:#e8eaed; --muted:#1d2129; --muted-foreground:#8b919c; --accent:#1d2129; --accent-foreground:#e8eaed; --destructive:#f26d6d; --border:#262a33; --input:#262a33; --ring:#6fcf97;` sidebar vars mirror card/primary/border; charts may stay.
  Add `--info:#8ea2ff;` to `.dark` and `:root` (same value), and `--color-info: var(--info);` inside `@theme inline`.
- [ ] **Step 3:** Delete `ThemeToggle`; remove its import and usage from `MobileNav`.
- [ ] **Step 4:** `npm run lint && npm test && npm run build` → all pass. `git grep -n "ThemeToggle\|'rose'\|\.rose" -- app tests` → no output.
- [ ] **Step 5: Commit** `feat: force a single dark theme with the new palette`

### Task 3: Three-link nav, bottom tab bar, header

**Files:**
- Create: `app/components/SiteNav/index.tsx` (client)
- Modify: `app/components/Header/index.tsx`, `app/[locale]/layout.tsx` (body padding), `messages/{en,ru}.json`
- Delete: `app/components/MobileNav/`, `tests/app/components/MobileNav/`
- Test: `tests/app/components/SiteNav/index.test.tsx` (new), `tests/app/components/Header/index.test.tsx`

**Interfaces:**
- Produces: `SiteNav` default export, no props. Renders a desktop `<ul>` (`hidden sm:flex`) and a mobile `<nav aria-label={t('main')}>` fixed at the bottom (`sm:hidden fixed inset-x-0 bottom-0 z-40 bg-card border-t`). Links: `/think-time` (`nav.positions`, icon `CrosshairIcon`), `/games` (`nav.games`, `LayoutGridIcon`), `/lessons` (`nav.learn`, `GraduationCapIcon`). Active = `pathname === href || pathname.startsWith(href + '/')`; active links get `aria-current="page"` and the accent (desktop: `shadow-[inset_0_-2px_0_var(--primary)]` underline; mobile: `text-primary`).

- [ ] **Step 1: Write the failing tests** `SiteNav/index.test.tsx` (mock `@/i18n/navigation` with a controllable `usePathname`):
  - `it('links to positions, games and learn')`: in the desktop list, hrefs are `['/think-time','/games','/lessons']`.
  - `it('marks the current section')`: pathname `/lessons/theory` → the Learn links have `aria-current="page"`, others don't.
  - `it('renders a bottom tab bar for mobile')`: `getByRole('navigation', { name: 'nav.main' })` contains three links.
  Header test: drop the drawer tests and `openDrawer`; add `it('shows the language toggle in the header')` → `getByRole('button', { name: /language/i })`; keep the signed-in / signed-out tests.
- [ ] **Step 2:** `npx jest tests/app/components/SiteNav tests/app/components/Header` → FAIL.
- [ ] **Step 3:** Implement `SiteNav`. In `Header`: remove `navLinks` and `MobileNav`; layout = logo, `<SiteNav />`, then `ml-auto` group with `NotificationBell`, `LanguageToggle`, `AccountMenu` or Sign in link (guests also get Sign up on `sm+`). Header container widens to `max-w-6xl`. Update the header comment (the drawer reason no longer holds: account links live in AccountMenu since spec 015). Add `pb-16 sm:pb-0` to `<body>`. Messages: add `nav.positions` ("Positions"/"Позиции"), `nav.learn` ("Learn"/"Обучение"), `nav.main` ("Main navigation"/"Основная навигация"); keep `nav.games`; remove `nav.worldChampions`, `nav.theory`, `nav.thinkTime`, `nav.openMenu` after grep confirms no users. Delete MobileNav and its test.
- [ ] **Step 4:** `npx jest tests/app/components/SiteNav tests/app/components/Header` → PASS; then `npm run lint && npm test && npm run build` → pass.
- [ ] **Step 5: Commit** `feat: three-link header nav with a mobile tab bar`

## Part 2. New Key Positions screen

### Task 4: Board without coordinates

**Files:** Modify `app/components/ChessboardWithNotation/index.tsx`; Test `tests/app/components/ChessboardWithNotation/index.test.tsx` (new; mock `react-chessboard` to a `<div data-testid="board" />`)

**Interfaces:** Produces prop `showCoordinates?: boolean` (default `true`). When `false`, renders only the `Chessboard`, no label columns.

- [ ] **Step 1: Tests:** `it('draws coordinates by default')` → text `8` and `a` present; `it('can hide coordinates')` → with `showCoordinates={false}`, `queryByText('8')` and `queryByText('a')` are null.
- [ ] **Step 2:** run → second test FAILS.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat: let the board hide its coordinates`

### Task 5: GamesShell can hand load-more to the consumer

**Files:** Modify `app/components/GamesShell/index.tsx`; Test `tests/app/components/GamesShell/*.test.tsx`

**Interfaces:** Produces optional prop `loadMoreInChildren?: boolean` (default `false`) and `RenderProps.loadMore: React.ReactNode` (the existing error/retry block or the load-more button, or `null`). When the prop is `true`, GamesShell does not render that block itself. `/games` keeps the default.

- [ ] **Step 1: Test** `it('lets the consumer place load more')`: with `hasMore` true and `loadMoreInChildren`, the button renders inside the children wrapper (`within(getByTestId('kids'))`) and exactly once.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** extract the two existing blocks into one `loadMoreControls` node; pass it via render props; render below only when the prop is false.
- [ ] **Step 4:** `npx jest tests/app/components/GamesShell tests/app/components/ChessComGames` → PASS.
- [ ] **Step 5: Commit** `refactor: let GamesShell consumers place load more`

### Task 6: PositionRow

**Files:** Create `app/components/LongThinks/PositionRow.tsx`; Test `tests/app/components/LongThinks/PositionRow.test.tsx`

**Interfaces:**
- Consumes: `showCoordinates` (Task 4).
- Produces: `PositionRow({ think, game, status, hasNewAnswer, selected, onSelect }: { think: LongThink; game: Game; status: ThreadStatus; hasNewAnswer: boolean; selected: boolean; onSelect: () => void })`. A `<button type="button" aria-pressed={selected}>` with a 52px thumbnail (`ChessboardWithNotation` at `fenBefore`, `game.userColor`, `showCoordinates={false}`, opponent's last move highlighted, `pointer-events-none`), the move label, think time via `formatSeconds`, then: `answered` → pill `thinkTime.answered` (`bg-primary/15 text-primary`); `asked` → pill `thinkTime.waiting` (`bg-info/15 text-info`); `none` → "vs {opponent} · {timeControl} · {date}". `hasNewAnswer` adds the existing new-answer dot. Selected: `border-primary/40 bg-primary/5`.
- Also produces `formatThinkMove(think: LongThink): string` and `lastMoveStyles(think: LongThink): Record<string, React.CSSProperties>` exported from `app/components/LongThinks/format.ts` (moved from `LongThinks/index.tsx` and `LongThinkCard.tsx`).

- [ ] **Step 1: Tests:** `it('shows the move and think time')` (`17. Nf5`, `2:14` for 134 s); `it('shows a waiting pill when asked')`; `it('shows an answered pill when answered')`; `it('shows the opponent when not asked')`; `it('reports selection')` (`aria-pressed` true when selected; click calls `onSelect`).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement; add `thinkTime.waiting` ("Waiting for answer"/"Ждёт ответа") and `thinkTime.answered` if not already present (reuse existing keys if the card has them).
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat: compact key-position row`

### Task 7: PositionDetail

**Files:** Create `app/components/LongThinks/PositionDetail.tsx`; Test `tests/app/components/LongThinks/PositionDetail.test.tsx`

**Interfaces:** Produces `PositionDetail({ think, game, thread, isAuthenticated, onAskCoach, onOpenGame, onBack, counter }: { think: LongThink; game: Game; thread?: { body: string; responses: { body: string }[] }; isAuthenticated: boolean; onAskCoach: () => void; onOpenGame: () => void; onBack?: () => void; counter?: { n: number; total: number } })`.
Layout: optional top bar (Back button + counter, rendered only when `onBack` is given); board (`ChessboardWithNotation`, coordinates on, `lastMoveStyles`) beside an info column: label `thinkTime.detail.youThought`, big `formatSeconds(think.seconds)` in `text-primary tabular-nums`, `thinkTime.detail.overMove` with the move; `PlayerRow` for opponent and user; time control · date · result; buttons. Stacks vertically under `xl`.

- [ ] **Step 1: Tests:**
  - `it('offers to ask the coach when signed in without a thread')` → button `thinkTime.detail.askCoach` calls `onAskCoach`.
  - `it('opens the question when a thread exists')` → button `thinkTime.detail.openQuestion` calls `onAskCoach`; the latest response body is visible.
  - `it('shows a sign-in hint to guests')` → no ask/open-question button; text `thinkTime.detail.signInToAsk` present.
  - `it('always offers the whole game')` → `thinkTime.detail.openGame` calls `onOpenGame`.
  - `it('shows back and counter on mobile')` → with `onBack` and `counter={{n:1,total:24}}`, "1 / 24" visible and Back calls `onBack`; without `onBack`, no Back button.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement; add `thinkTime.detail.{youThought, overMove, askCoach, openQuestion, openGame, signInToAsk, back, counter}` to both message files (copy from spec i18n section; `signInToAsk`: "Sign in to ask a coach about this position" / "Войди, чтобы спросить тренера об этой позиции").
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat: key-position detail panel`

### Task 8: Two-column LongThinks

**Files:** Modify `app/components/LongThinks/index.tsx`, `app/[locale]/think-time/page.tsx`; Delete `app/components/LongThinks/LongThinkCard.tsx`, `tests/app/components/LongThinks/LongThinkCard.test.tsx`; Test `tests/app/components/LongThinks/LongThinks.test.tsx`

**Interfaces:** Consumes Tasks 5–7. State: `selectedKey: string | null` (key = `${game.id}-${think.moveIndex}`), `mobileOpen: boolean`. The selected item = the visible item with `selectedKey`, falling back to the first visible item.

- [ ] **Step 1: Update tests** (mock `PositionRow` and `PositionDetail` as thin stubs exposing their callbacks; keep the existing GamesShell / dynamic mocks, adding `loadMore: null` to the render props):
  - `it('selects the first position by default')`.
  - `it('shows the clicked position')`.
  - `it('falls back to the first row when the filter hides the selection')`.
  - `it('shows the empty message instead of a detail panel')` (collectLongThinks → `[]`).
  - `it('marks an unseen answer seen when opening the question')` (keep the existing assertion, triggered through the detail stub's `onAskCoach`).
  - `it('opens the game modal from the detail panel')`.
  - `it('opens full-screen detail on mobile and closes it with back')`: clicking a row sets the detail wrapper's `data-mobile-open="true"`; the detail stub's `onBack` sets it back to `"false"`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement. `GamesShell` gets `loadMoreInChildren`. Children render `grid lg:grid-cols-[360px_1fr] gap-6`: left column = `ThresholdSelector`, the filter tabs (restyled as a segmented control: `bg-card border rounded-[9px] p-[3px]`, active tab `bg-secondary`), rows, `loadMore`; right column = detail wrapper `hidden lg:block lg:sticky lg:top-6 self-start`, with `mobileOpen` adding `fixed inset-0 z-50 block overflow-y-auto bg-background p-4 lg:static lg:p-0`. Row click: `setSelectedKey` + `setMobileOpen(true)`. Detail: `onBack` only on mobile (pass it always; the Back bar is `lg:hidden`). `openCoaching` stays as is. The page widens to `max-w-6xl`. Remove `LongThinkCard` and its test.
- [ ] **Step 4:** `npx jest tests/app/components/LongThinks` → PASS; `npm run lint && npm test && npm run build` → pass.
- [ ] **Step 5: Commit** `feat: two-column key positions screen`

## Part 3. The rest in the new style

### Task 9: Hardcoded colours, icons and OG image

**Files:** Modify `app/components/CoachingThreadCard/index.tsx`, `app/components/NotificationBell/BadgePill.tsx`, `app/[locale]/icon.tsx`, `app/[locale]/apple-icon.tsx`, `app/[locale]/opengraph-image.tsx`, plus anything the grep finds.

- [ ] **Step 1:** `git grep -n -E "bg-white|text-black|bg-black|stone-|#[0-9a-fA-F]{6}" -- app ':!app/components/ui'`. Keep piece-colour dots (`PlayerRow` `bg-white`/`bg-black`) and `text-white` on `bg-destructive`. Swap the rest to tokens.
- [ ] **Step 2:** Icons/OG: replace the rose palette with `INK = '#0f1115'`, accent `'#6fcf97'`, light text `'#e8eaed'` (image routes can't read CSS vars, so hex is allowed here).
- [ ] **Step 3:** `npm run lint && npm test && npm run build` → pass.
- [ ] **Step 4: Commit** `style: move remaining colours and brand images to the dark palette`

### Task 10: Landing for guests, redirect for signed-in users

**Files:** Modify `app/[locale]/page.tsx`; Test `tests/app/page.test.tsx`

- [ ] **Step 1: Tests:** mock `@/lib/auth/getUser` and add `redirect` to the `@/i18n/navigation` mock; mock `getLocale` → `'en'`.
  - `it('sends signed-in users to key positions')` → `redirect` called with `{ href: '/think-time', locale: 'en' }`.
  - existing tests run with `getAuthedUser` → `null`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** at the top of `Home`: `const user = await getAuthedUser(); if (user) redirect({ href: '/think-time', locale: await getLocale() });` (same pattern as `admin/page.tsx`). Restyle sections with the new tokens (hero with a primary CTA to `/think-time`, feature cards on `bg-card`).
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat: send signed-in users from the landing to key positions`

### Task 11: Visual pass on every page

**Files:** whatever the pass touches: `/games` + `GameModal`, `/lessons/*` + `VideoModal`, `CoachingModal`, `/coaching`, `/admin` (token check only), auth pages, `/profile`, `loading.tsx`, `error.tsx`.

- [ ] **Step 1:** `npm run dev`; sign in as `mark` / `123456` (local seed; login is by nickname). Visit each page at 375px and 1440px.
- [ ] **Step 2:** Fix what looks off with tokens and spacing only: page containers `max-w-6xl` for app screens and `max-w-md` for auth forms, cards `rounded-[10px] bg-card border`, section labels small uppercase `tracking-wider text-muted-foreground`, nothing hidden behind the tab bar. No behaviour changes.
- [ ] **Step 3:** Coaching modal round trip: as student ask with a variation chip; as admin answer with an arrow; as student open the answer. Bell and Telegram prompt still show.
- [ ] **Step 4:** `npm run lint && npm test && npm run build` → pass.
- [ ] **Step 5: Commit** `style: restyle remaining pages for the dark design`

### Task 12: Finish

- [ ] **Step 1:** Tick the acceptance criteria in `specs/017-redesign.md`, set `Status: done`.
- [ ] **Step 2:** Final `npm run lint && npm test && npm run build`.
- [ ] **Step 3: Commit** `docs: spec 017 done`, then follow superpowers:finishing-a-development-branch (PR against `main`; description lists the calls made without the user).
