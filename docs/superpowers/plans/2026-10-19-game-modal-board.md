# Game Modal Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Large, readable game modal board with explicit turn/color labels and last-move highlight; no crash on custom-start PGNs; good at phone widths.

**Architecture:** Extract replay into `lib/chess/replay.ts` (pure, tested), driven by chess.js verbose history `before`/`after` FENs. `GameModal` consumes it, renders a two-line `PlayerRow`, passes last-move `squareStyles`, and sizes the board from the viewport.

**Tech Stack:** chess.js 1.4, react-chessboard 5.10, next-intl, Tailwind v4, Jest + RTL.

**Spec:** `specs/004-game-modal-board.md`

## Global Constraints

- Board max 720 px; modal fits 1366×768 without scroll; dialog `max-h-[calc(100dvh-2rem)] overflow-y-auto`.
- Last-move color `rgba(255, 213, 79, 0.5)`; swatch `size-4`; color/turn line `text-xs text-muted-foreground`; active row `border-l-4 border-primary`, inactive `border-l-4 border-transparent`.
- New keys `games.modal.white` ("White"/"Белые"), `games.modal.black` ("Black"/"Чёрные"), `games.modal.toMove` ("To move"/"Ходит").
- Semantic tokens elsewhere; `cn()`; lint zero warnings; build passes.

## Review Focus

1. Empty / move-less PGN (`""`, headers only) → one position, nav disabled, no crash. Test in Task 1.
2. PGN with promotion — `after` FEN carries the promoted piece. Test in Task 1.
3. `initialIndex` beyond `totalMoves` (long-think card pointing past a fallback replay) → clamped, no undefined FEN. Test in Task 2.
4. Final position with checkmate: "To move" sits on the mated side, no crash. Covered by the flip test in Task 2.
5. Dark theme: swatch border still visible — check in Task 3's visual pass.

---

### Task 1: Pure replay module

**Files:**
- Create: `lib/chess/replay.ts`
- Test: `tests/lib/chess/replay.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ReplayMove = { san: string; color: 'white' | 'black'; fullMoveNumber: number; from: string; to: string };
  export function buildReplay(pgn: string, fallbackFen: string): { positions: string[]; moves: ReplayMove[] };
  export function formatMoveLabel(move: ReplayMove): string; // "12. Nf3" / "12… Nf6"
  ```

- [ ] **Step 1: Write failing tests**
  - `replays a standard game`: `'1. e4 e5 2. Nf3'` → 4 positions, `positions[0]` is the standard start FEN, moves `[{san:'e4',color:'white',fullMoveNumber:1,from:'e2',to:'e4'}, …]`.
  - `replays from a custom FEN header`: `[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e4 Kd7 *` → no throw, `positions[0]` is that FEN, 3 positions.
  - `numbers a black-first game from the FEN`: FEN `4k3/8/8/8/8/8/4P3/4K3 b - - 0 7`, moves `7... Kd7 8. e4` → first move `{color:'black', fullMoveNumber:7}`, `formatMoveLabel` → `'7… Kd7'`; second → `'8. e4'`.
  - `falls back to the final FEN when the PGN can't be parsed`: pgn `'1. e4 e5 2. Qxf7#?? garbage Zz9'` (any string `loadPgn` rejects — assert by also checking `new Chess().loadPgn` throws for it in the test setup) → `{ positions: [fallback], moves: [] }`.
  - `handles an empty PGN`: `''` → `positions` length 1, `moves` empty, no throw.
  - `keeps promotions in the after FEN`: `[FEN "8/P6k/8/8/8/8/8/K7 w - - 0 1"]` + `1. a8=Q` → last position's board field starts with `Q`.
- [ ] **Step 2: Run** `npm test -- tests/lib/chess/replay.test.ts` — Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** `loadPgn` in try/catch → fallback. Positions: `[history[0]?.before ?? parser.fen()]` then each `after`. Move number: `Number(before.split(' ')[5])`. For an empty history with no FEN header, `parser.fen()` is the standard start.
- [ ] **Step 4: Run** same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat: FEN-aware game replay module`

### Task 2: GameModal readability + bug fixes

**Files:**
- Modify: `app/components/ChessComGames/GameModal.tsx`
- Modify: `app/components/ChessboardWithNotation/index.tsx` (labels `text-xs` → `text-sm`)
- Modify: `messages/en.json`, `messages/ru.json` (3 keys)
- Test: `tests/app/components/ChessComGames/GameModal.test.tsx`

**Interfaces:**
- Consumes: `buildReplay`, `formatMoveLabel`, `ReplayMove` (Task 1). Props of `GameModal` unchanged.

- [ ] **Step 1: Write failing tests.** Mock `@/app/components/ChessboardWithNotation` with a stub that renders `data-testid="board"` and exposes `position` and `JSON.stringify(Object.keys(squareStyles ?? {}).sort())` as data attributes. Game fixture: user `alice` white, opponent `bob` black, pgn `1. e4 e5 2. Nf3`, clock snapshots for 4 positions, increment 0.
  - `labels each player's color`: rows contain "White" (alice) and "Black" (bob).
  - `shows To move on the side to move and flips when stepping`: at index 0 "To move" is in alice's row; press `ArrowRight` → in bob's row; exactly one "To move" in the document each time.
  - `highlights the last move squares`: index 0 → highlight keys `[]`; `ArrowRight` → `["e2","e4"]`.
  - `prevents default for navigation keys`: `fireEvent.keyDown(document, { key: 'End' })` returns `false` (default prevented) for `End`, `Home`, `ArrowLeft`, `ArrowRight`.
  - `attributes duration to black in a black-first game`: pgn with FEN `… b - - 0 1` and `1... Kd7`, snapshots `[{whiteSeconds:60,blackSeconds:60},{whiteSeconds:60,blackSeconds:50}]` → after `ArrowRight`, caption contains `0:10` (use whatever `formatSeconds(10)` returns).
  - `does not crash on an unparseable PGN and disables navigation`: pgn rejected by `loadPgn` → board position equals `game.finalFen`, next/last buttons disabled.
  - `clamps initialIndex past the end`: `initialIndex={99}` on the 3-move game → board position is the last FEN, counter "Move 3 / 3".
- [ ] **Step 2: Run** `npm test -- tests/app/components/ChessComGames/GameModal.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** per spec §Players and turn / §Last move / §Board / §Bugs, using Global Constraints values. Board wrapper: `w-full max-w-[min(720px,calc(100dvh-260px))] mx-auto`; `DialogContent` `sm:max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto`. Clock `text-base`.
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit`, `npm run lint`, en/ru key check — Expected: all pass.
- [ ] **Step 5: Commit** `feat: larger, clearer game modal board`

### Task 3: Visual pass (desktop + phone)

**Files:** `GameModal.tsx` / `ChessboardWithNotation` only if the pass finds problems.

- [ ] **Step 1:** In Chrome, open a game on `/en/games` inside iframes at 1366×768, 375×812, 320×640, 740×360; check: no horizontal overflow, whole modal visible at 1366×768 without scroll, board fills width on phones, landscape scrolls without clipping, labels readable, both themes (toggle `dark` class).
- [ ] **Step 2:** Fix any problem with responsive classes; re-run `npm test` and `npm run lint`.
- [ ] **Step 3:** Record findings in the ledger for the PR body.
- [ ] **Step 4: Commit** `fix: game modal layout tweaks from visual pass` (skip if nothing changed).
