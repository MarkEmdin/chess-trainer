# Spec: dark redesign around Key Positions

Status: approved
Branch: feature/redesign

## Problem

The site grew one feature at a time and looks like it. Five equal nav links sit in a drawer, three colour themes need upkeep, and the piece-value trainer looks out of place next to the real product. Key Positions is what users come for, but it is a long feed of cards, and you only see a position after opening a modal.

## Goal

One modern dark design built around Key Positions. A user opens `/think-time`, sees the list of positions next to a large board, picks one, and asks the coach without hunting for anything. Everything else gets the same look and stays out of the way.

Approved mockup: `specs/assets/017-positions-mockup.html`. Open it in a browser; the pieces load from the Lichess CDN.

## Non-goals

- Light or rose themes and any theme switcher. Themes come back in a later release.
- The board itself. It stays `react-chessboard` as `ChessboardWithNotation` draws it now: default colours `#f0d9b5` / `#b58863`, default pieces, coordinates outside (ranks left, files bottom), yellow last-move highlight, our arrows and circles.
- New features or data: no date grouping, no new sort orders, no new filters, no new DB columns or migrations.
- Admin screens beyond what the shared tokens and header give them for free.
- Changes to what the coaching modal does. It only gets restyled.

## Anti-goals (a failure even if it works)

- Any existing flow breaks: ask coach, answer seen/unseen, notifications bell, Telegram prompt, load more, chess.com / lichess switch, guest flow with a localStorage username.
- The board looks different from today.
- Leftover piece-value code, keys, or tests.

## Delivery

One PR, three parts, each its own commit series and checkable on dev before the next starts.

### Part 1. Clean-up and dark base

1. **Delete the piece-value trainer:** `app/[locale]/lessons/piece-values/`, `app/components/PieceValuesTraining/`, `app/constants/chessPieces.ts` (if nothing else imports it), `tests/app/components/PieceValuesTraining/`, the `pieceValues` namespace and `nav.pieceValues` / `lessons.pieceValues` keys in both `messages/en.json` and `messages/ru.json`, and every link to `/lessons/piece-values` (Header, Lessons page, landing). Grep for `pieceValues`, `piece-values`, `PieceValues`, `chessPieces` afterwards: zero hits outside `specs/`.
2. **Single dark theme:** keep `next-themes` and `ThemeProvider` (themes come back later) but force dark with `forcedTheme="dark"`, `themes={['dark']}`, `defaultTheme="dark"`. Delete `ThemeToggle` and its uses. Delete the `.rose` block in `app/globals.css`. Put the new palette into the `.dark` tokens (see Visual language). Leave `:root` light values alone: they are the base for the future theme work and nothing renders them.
3. **Header and nav:** three inline links on desktop: Positions (`/think-time`), Games (`/games`), Learn (`/lessons`). The active link gets the accent underline. Logo left; bell, language toggle and AccountMenu (or Sign in) right. Under `sm`, the links move to a fixed bottom tab bar with icon and label; the header keeps logo, bell, language and account. `MobileNav` (the drawer) is deleted: the account links already live in AccountMenu (spec 015), and `LanguageToggle` moves into the header. The page body gets bottom padding on mobile so the tab bar never covers content.
4. **Learn page** (`/lessons`) lists only Theory and World Champions. Games and Key Positions are no longer listed there because they are in the nav.

### Part 2. New Key Positions screen

Layout from the mockup.

- **Desktop (`lg` and up):** two columns. Left (about 360px): title with count, a source chip (platform and username; opens the existing username / platform controls) and a threshold chip (the existing `ThresholdSelector` values), the existing filter tabs `all / unasked / asked` with counts, then the list. Right: the selected position.
- **List row:** a small board thumbnail of the position before the move, the move (`17. Nf5` / `23… Rxe4`), think time in `m:ss`, and either the status pill (`asked` = waiting, `answered`, plus the existing unseen-answer marker) or "vs opponent · time control · date". The selected row is highlighted. Order and the "load more" behaviour stay as today.
- **Detail panel:** large board at the position before the long think, with the played move highlighted. Under the board, prev/next buttons step through the game (same stepping as `GameModal`). On the right: "You thought 2:14 over 17. Nf5", both players with ratings, time control, date and result. Then the buttons:
  - Signed in, no thread: primary "Ask coach" opens `CoachingModal` as today.
  - Signed in, thread exists: primary "Open question" opens `CoachingModal` and marks an unseen answer as seen (same logic as `openCoaching` today). Show a short preview of the latest message, as the card does now (spec 013).
  - Guest: no coach button. Show a short sign-in hint instead.
  - Always: secondary "Open the whole game" opens `GameModal` at this move.
- **Default selection:** the first row of the current filter. Changing filter or threshold re-selects the first row. An empty list shows the existing empty messages in place of the detail panel.
- **Mobile (under `lg`):** only the list. Tapping a row opens the detail view full screen with "← Back" and an "n / total" counter. Pick the mechanism (in-page state or a full-screen sheet); a new route is not needed. Back returns to the list at the same scroll position.
- **States:** no username yet (guest or signed-in user without a saved one) shows the existing `UsernameForm` centred where the two columns would be. Loading and error states keep today's `GamesShell` behaviour, restyled.

### Part 3. The rest in the new style

Same tokens, spacing and components, no behaviour changes:

- `/games` (game list and `GameModal`)
- `/lessons`, `/lessons/theory`, `/lessons/world-champions`, `VideoModal`
- `CoachingModal` (student and admin sides), `/coaching`
- auth pages: login, register, forgot / reset password, check-email, email-confirmed
- `/profile`, the landing page `/`, `loading.tsx`, `error.tsx`

**Landing:** guests see the landing; signed-in users who open `/` are redirected to `/think-time` (server-side redirect in the page). Landing copy and links drop piece values and point the main CTA at Key Positions.

## Visual language

From the mockup, as `.dark` tokens in `app/globals.css`:

| Token | Value | Use |
|---|---|---|
| background | `#0f1115` | page |
| card / popover | `#171a20` | header, rows, panels |
| secondary / muted | `#1d2129` | secondary buttons, active tab, chips |
| border / input | `#262a33` | all borders |
| foreground | `#e8eaed` | text |
| muted-foreground | `#8b919c` | secondary text, labels, board coordinates |
| primary | `#6fcf97`, foreground `#0b1a12` | the one accent: primary button, think time, active nav, answered pill |
| info (new token) | `#8ea2ff` on `#232845` | "waiting for answer" pill |
| destructive | keep a red that reads on dark | errors |

- Font stays Geist. Labels are small uppercase with letter spacing. Numbers (think time, ratings) use tabular figures.
- Radii: rows and panels 10px, buttons 9px, pills fully round.
- One accent colour per screen; the selected row uses a faint accent tint and an accent-tinted border.
- Hover/focus via token opacity per conventions (`hover:bg-primary/90` etc.); visible focus rings.
- Exact values may be tuned during build if contrast fails WCAG AA for text; the builder decides and notes it in the PR.

## Data & types

No new data. Reuses `collectLongThinks`, `useMyCoachingRequests`, `threadStatus`, `isUnseen`, `markResponseSeen`, `matchesAskedFilter`, `useStoredThreshold`, `GamesShell`. If `GamesShell`'s render-prop shape doesn't fit the two-column layout, adjust it, keeping `/games` working.

## UI

- `LongThinks` becomes the two-column container. Expect it to grow past three coupled components (list, row, detail panel, mobile detail), so keep it a feature folder; `LongThinkCard` may be replaced by a list row and a detail panel.
- Client components stay client; the header stays a server component with client islands (bell, account, language, active-link highlight).
- `GameModal` and `CoachingModal` keep loading via `dynamic(..., { ssr: false })`.
- The thumbnail board in a list row can use `ChessboardWithNotation` without labels or a lighter static render, as long as it looks like the same board. The builder picks based on performance with 50+ rows.
- The known `radix-ui asChild` issue applies to any new Sheet/Dialog triggers: follow the workaround in `.claude/rules/known-issues.md`.

## i18n

Both `messages/en.json` and `messages/ru.json`, same key tree. Labels:

- `nav.positions` "Positions" / "Позиции", `nav.games` "Games" / "Партии", `nav.learn` "Learn" / "Обучение". Remove `nav.pieceValues`, `nav.worldChampions`, `nav.theory`, `nav.thinkTime`, `nav.openMenu` if nothing else uses them.
- `thinkTime.detail.*`: `youThought` ("You thought" / "Ты думал"), `overMove` ("over {move}" / "над ходом {move}"), `askCoach`, `openQuestion`, `openGame` ("Open the whole game" / "Открыть всю партию"), `signInToAsk`, `back` ("Back" / "Назад"), `counter` ("{n} / {total}").
- Remove the whole `pieceValues` namespace and `lessons.pieceValues`.
- The builder adds any other keys needed, in both files.

## Acceptance criteria

Part 1
- [ ] No `pieceValues` / `piece-values` / `PieceValues` / `chessPieces` hits outside `specs/`; `/lessons/piece-values` returns 404
- [ ] The site renders dark only; there is no theme switcher anywhere
- [ ] Desktop header shows three links with the active one marked; mobile shows the bottom tab bar, and nothing is hidden behind it
- [ ] Language toggle and the account menu still work on both breakpoints

Part 2
- [ ] Desktop `/think-time` shows list and detail side by side; the first row is selected by default
- [ ] The board in the detail panel and in thumbnails looks like today's board
- [ ] Ask coach, open question (marks the answer seen), open the whole game, filter tabs, threshold, load more and platform switch all work
- [ ] Guest flow: username form, list, detail without the coach button
- [ ] Mobile: row tap opens full-screen detail, Back returns to the list at the same scroll position

Part 3
- [ ] Every page listed in Part 3 uses the new tokens; no hardcoded surface colours added
- [ ] Signed-in `/` redirects to `/think-time`; guests see the landing
- [ ] Coaching modal works for student and admin as before (send, answer, variations, drawings)

All
- [ ] `npm run lint` (zero warnings), `npm run build`, `npm test` pass
- [ ] Tests updated or added under `tests/` for changed components (header nav, tab bar, Key Positions selection and buttons, landing redirect)
- [ ] Manual check on dev at 375px and 1440px widths
