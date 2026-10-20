# Coaching Variations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Student and coach can attach one recorded variation to their coaching message. The reader steps through it on the board. Asking, answering and reading all happen in one large modal.

**Architecture:** A pure `lib/chess/variation.ts` validates and replays SAN lines from a FEN. It is used by both the server actions and the client. `useVariationRecorder` holds recording state. `VariationBoard` renders `idle | recording | viewing` on top of an interactive `ChessboardWithNotation`. One `CoachingModal` feature folder replaces `CoachingRequestModal` and the inline admin form. The cards on `/coaching` and `/admin` become previews that open the modal.

**Tech Stack:** Next.js 16, Supabase (Postgres + RLS), chess.js 1.4, react-chessboard 5.10 (`onPieceDrop`, `onSquareClick`, `allowDragging`), next-intl, Tailwind v4, Jest + RTL.

**Spec:** `specs/005-coaching-variations.md`

## Global Constraints

- One variation per message, stored as `text[]` of SAN. It is nullable. When present it has 1–40 half-moves (`cardinality(variation) between 1 and 40`).
- Text body stays required, max 4000 characters.
- Promotion always to queen (`promotion: 'q'`).
- Board sizing follows the game modal: `max-w-[max(280px,min(720px,calc(100dvh-310px)))]`, dialog `max-h-[calc(100dvh-2rem)] overflow-y-auto`. Textarea `rows={10}` on `sm+`, 6 on phones, `resize-y`.
- Recording glow: `ring-2 ring-green-600 shadow-[0_0_16px] shadow-green-600/50` on the board frame, only while recording.
- Keyboard nav while viewing: ←/→/Home/End with `preventDefault` on Home/End (same as `GameModal`).
- i18n keys exactly as listed in spec §i18n, in both `messages/en.json` and `messages/ru.json`.
- `cn()`, semantic tokens, `@/` imports, `dynamic(..., { ssr: false })` for the modal. Lint zero warnings; build passes.

## Review Focus

1. Old rows with `variation = null`: the thread renders exactly as before, with no "View variation" button. Test in Task 5.
2. Position with black to move (most long-think positions after white's move): numbering is `14… Nf6 15. e5`, never `14. Nf6`. Test in Task 1.
3. A recorded line that ends in mate or stalemate: the recorder rejects further moves without throwing. Test in Task 3.
4. Malformed `variation` field (not JSON, not an array, non-strings, illegal SAN, 41 moves, empty array): the server action returns `invalidVariation` and nothing is inserted. Test in Task 2.
5. Pressing "View variation" while recording: the view buttons are disabled during recording, so the in-progress line is never lost. Test in Task 4.

---

### Task 1: Pure variation module

**Files:**
- Create: `lib/chess/variation.ts`
- Test: `tests/lib/chess/variation.test.ts`

**Interfaces:**
- Consumes: `ReplayMove`, `formatMoveLabel` from `lib/chess/replay.ts`.
- Produces:
  ```ts
  export const MAX_VARIATION_MOVES = 40;
  export function playVariation(fen: string, sans: string[]): { positions: string[]; moves: ReplayMove[] } | null;
  export function formatVariation(moves: ReplayMove[]): string;
  export function parseVariationField(raw: FormDataEntryValue | null): string[] | null | 'invalid';
  ```

- [ ] **Step 1: Write failing tests**
  - `plays a legal line`: start FEN, `['e4','e5','Nf3']` → 4 positions, `moves[2]` `{san:'Nf3', color:'white', fullMoveNumber:2, from:'g1', to:'f3'}`.
  - `returns null on an illegal move`: `['e4','e4']` → `null`.
  - `empty line`: `[]` → `{ positions:[fen], moves:[] }`.
  - `formats a black-first line`: FEN `r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3`, `['Nf6','Nc3','Bc5']` → `'3… Nf6 4. Nc3 Bc5'`.
  - `formats a white-first line`: start FEN, `['e4','e5']` → `'1. e4 e5'`.
  - `parseVariationField`: `null` → `null`; `''` → `null`; `'["e4"]'` → `['e4']`; `'nope'`, `'{}'`, `'[1]'`, `'[]'`, a 41-item array → `'invalid'`.
- [ ] **Step 2: Run** `npm test -- tests/lib/chess/variation.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** `playVariation`: `new Chess(fen)`, then `chess.move(san)` in a try/catch per SAN. Build `ReplayMove` the same way `buildReplay` does. Return `null` on the first throw. `formatVariation`: use `formatMoveLabel` for the first move and every white move; a black move after a white one is bare SAN; join with spaces. `parseVariationField` only checks shape (array of 1–`MAX_VARIATION_MOVES` strings); legality is checked by the caller with `playVariation`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: pure variation replay and formatting`

### Task 2: Database column + server actions

**Files:**
- Create: `supabase/migrations/20261020120000_coaching_variations.sql`
- Modify: `lib/coaching/actions.ts`
- Modify: `messages/en.json`, `messages/ru.json` (`coaching.errors.invalidVariation`: "This variation can't be saved. Try recording it again." / "Этот вариант не удалось сохранить. Попробуйте записать его заново.")
- Test: `tests/lib/coaching/actions.test.ts` (mock pattern: `tests/lib/auth/actions.test.ts`)

**Interfaces:**
- Consumes: `playVariation`, `parseVariationField` (Task 1).
- Produces: both actions accept an optional form field `variation` (JSON string array) and insert `variation: string[] | null`.

- [ ] **Step 1: Migration.** Add `variation text[]` to `coaching_requests` and `coaching_responses`, each with check `variation is null or cardinality(variation) between 1 and 40`. No policy changes.
- [ ] **Step 2: Write failing tests**
  - `createCoachingRequest stores a valid variation`: form with `variation='["Nf6"]'` and a black-to-move `fen` → `insert` called with `variation: ['Nf6']`.
  - `createCoachingRequest without variation stores null`.
  - `createCoachingRequest rejects malformed or illegal variation`: for each of `'nope'`, `'[]'`, `'["Ke8xe1"]'` → returns `{ error: <invalidVariation> }` and `insert` is not called.
  - `respondToRequest validates against the request's fen`: mocked select returns `{ fen }`; a variation legal from that FEN → insert with it; an illegal one → `invalidVariation`, no insert.
- [ ] **Step 3: Run** `npm test -- tests/lib/coaching/actions.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement.** In both actions: `const parsed = parseVariationField(formData.get('variation'))`. Return `invalidVariation` if the result is `'invalid'` or if it is an array and `playVariation(fen, parsed)` is `null`. In `respondToRequest`, load the request's `fen` with `.from('coaching_requests').select('fen').eq('id', request_id).single()` before the duplicate check. A missing request → `missingFields`. Revalidate `/[locale]/admin` and `/[locale]/coaching`.
- [ ] **Step 5: Run** the same command. Expected: PASS.
- [ ] **Step 6: Commit** `feat: store and validate coaching variations`

### Task 3: Recorder hook

**Files:**
- Create: `app/components/CoachingModal/useVariationRecorder.ts`
- Test: `tests/app/components/CoachingModal/useVariationRecorder.test.ts`

**Interfaces:**
- Consumes: `MAX_VARIATION_MOVES`, `playVariation` (Task 1).
- Produces:
  ```ts
  export function useVariationRecorder(startFen: string, initial?: string[]): {
    moves: string[];            // SAN
    fen: string;                // position after the last recorded move
    lastMove: { from: string; to: string } | null;
    selected: string | null;    // tap-tap source square
    tryMove(from: string, to: string): boolean;
    clickSquare(square: string): void;
    undo(): void;
    clear(): void;
  };
  ```

- [ ] **Step 1: Write failing tests** (`renderHook` + `act`)
  - `records legal moves`: `tryMove('e2','e4')` → `true`, `moves` `['e4']`, `fen` reflects it, `lastMove` `{from:'e2',to:'e4'}`.
  - `rejects illegal moves`: `tryMove('e2','e5')` → `false`, `moves` unchanged.
  - `auto-promotes to a queen`: FEN `8/P6k/8/8/8/8/8/K7 w - - 0 1`, `tryMove('a7','a8')` → `moves` `['a8=Q+']`.
  - `tap-tap`: `clickSquare('g1')` → `selected 'g1'`; `clickSquare('f3')` → `moves` `['Nf3']`, `selected null`. Tapping an empty square or an opponent piece with nothing selected → `selected null`. Tapping another own piece while selected → reselects.
  - `undo / clear`: after two moves `undo` → one move; `clear` → `[]`, `fen === startFen`.
  - `continues from initial`: `useVariationRecorder(start, ['e4'])` → `fen` after e4, next `tryMove('e7','e5')` → `['e4','e5']`.
  - `stops at the move cap`: 40 legal moves recorded (knight shuffle `Nf3 Nf6 Ng1 Ng8` ×10) → the 41st `tryMove` returns `false`.
  - `no moves after mate`: fool's-mate FEN `rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3` → any `tryMove` returns `false`, no throw.
- [ ] **Step 2: Run** `npm test -- tests/app/components/CoachingModal/useVariationRecorder.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** State is the SAN array. Derive `fen` and `lastMove` with `playVariation(startFen, moves)`. `tryMove` uses `new Chess(fen).move({ from, to, promotion: 'q' })` in a try/catch.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: variation recorder hook`

### Task 4: Interactive board + VariationBoard + VariationLine

**Files:**
- Modify: `app/components/ChessboardWithNotation/index.tsx` (optional `allowDragging?`, `onPieceDrop?`, `onSquareClick?`; defaults keep the current behavior)
- Create: `app/components/CoachingModal/VariationBoard.tsx`, `app/components/CoachingModal/VariationLine.tsx`
- Modify: `messages/en.json`, `messages/ru.json` (`coaching.variation.*`, exact strings from spec §i18n)
- Test: `tests/app/components/CoachingModal/VariationBoard.test.tsx` (mock `react-chessboard` as existing `GameModal` tests do and expose the passed `options`)

**Interfaces:**
- Consumes: `useVariationRecorder` (Task 3), `playVariation`, `formatVariation`, `formatMoveLabel`.
- Produces:
  ```ts
  type BoardMode =
    | { kind: 'idle' }
    | { kind: 'recording' }
    | { kind: 'viewing'; sans: string[] };
  type VariationBoardProps = {
    fen: string;
    orientation: 'white' | 'black';
    canRecord: boolean;                       // author side only
    draft: string[] | null;                   // attached, not yet sent
    onDraftChange(next: string[] | null): void;
    viewing: string[] | null;                 // a sent variation the parent asked to show
    onStopViewing(): void;
    onRecordingChange(recording: boolean): void;
  };
  export default function VariationBoard(props: VariationBoardProps): JSX.Element;
  // VariationLine: { moves: ReplayMove[]; current?: number; onSelect?(i: number): void }
  ```

- [ ] **Step 1: Write failing tests**
  - `idle shows the record button only when canRecord`.
  - `recording adds the green glow and drag`: click "Record variation" → board frame has `ring-green-600`, the "Recording variation" label is visible, the mocked board receives `allowDragging: true`; `onRecordingChange(true)` is called.
  - `done attaches the draft`: simulate `onPieceDrop({sourceSquare:'e2', targetSquare:'e4'})`, click Done → `onDraftChange(['e4'])`, glow gone, board back at `fen`.
  - `done with no moves attaches nothing`: → `onDraftChange(null)`.
  - `edit continues the draft`; `remove` → `onDraftChange(null)`.
  - `viewing steps through the line`: `viewing=['e4','e5']` → board shows `fen`; ArrowRight twice → the position after e5 with last-move square styles; Home → `fen`; "Back to position" → `onStopViewing()`. Clicking move 1 in `VariationLine` jumps to it.
- [ ] **Step 2: Run** `npm test -- tests/app/components/CoachingModal/VariationBoard.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** The glow wrapper gets classes via `cn()`. The last-move highlight reuses the `GameModal` color `rgba(255, 213, 79, 0.5)`. The tap-tap selected square uses the same color. Nav buttons and keys follow `GameModal` (key listener only while viewing). Undo / Clear / Done appear only while recording.
- [ ] **Step 4: Run** the same command. Expected: PASS. Run `npm test` to confirm existing boards are unchanged.
- [ ] **Step 5: Commit** `feat: variation board with recording and viewing modes`

### Task 5: CoachingModal (student + coach), types and queries

**Files:**
- Create: `lib/coaching/types.ts`, `app/components/CoachingModal/index.tsx`
- Delete: `app/components/CoachingRequestModal/`, `app/components/CoachingResponseForm/`
- Modify: `lib/coaching/useMyCoachingRequests.ts`, `app/components/LongThinks/index.tsx`, `messages/{en,ru}.json`
- Test: `tests/app/components/CoachingModal/CoachingModal.test.tsx`

**Interfaces:**
- Consumes: `VariationBoard`, `VariationLine` (Task 4); `createCoachingRequest`, `respondToRequest` (Task 2).
- Produces:
  ```ts
  // lib/coaching/types.ts
  export type CoachingMessage = { body: string; created_at: string; variation: string[] | null };
  export type CoachingThreadData = CoachingMessage & { id: string; fen: string; responses: CoachingMessage[] };
  // CoachingModal props
  type Props = {
    mode: 'student' | 'coach';
    fen: string;
    orientation: 'white' | 'black';
    moveLabel: string;            // title line, e.g. "14… Nf6"
    subtitle?: string;            // date / "asked by X"
    gameUrl: string;
    thread: CoachingThreadData | undefined;  // undefined = student asking a new question
    askContext?: { moveIndex: number };      // required when student + no thread
    onClose(): void;
    onSubmitted?(): void;
  };
  ```
  `MyCoachingRequest` becomes an alias of `CoachingThreadData`; the fetcher selects `variation` on both tables.

- [ ] **Step 1: Write failing tests** (mock the two actions)
  - `student asks with text and variation`: record e4-style move (via the mocked board), Done, type text, submit → action FormData has `body`, `fen`, `move_index`, `move_san`, `variation='[…]'`.
  - `student asks without a variation`: FormData has no `variation` field.
  - `coach sees the question's variation and replies`: `mode='coach'`, thread with `variation:['Nf6']` and no responses → "View variation" shows `3… Nf6`-style line; the reply form is present; submit sends `request_id`, `body`, `variation`.
  - `student reads the answer`: thread with one response carrying a variation → "View variation" on the response, no form.
  - `old thread without variations`: `variation: null` everywhere → no "View variation" buttons.
  - `view buttons disabled while recording`.
- [ ] **Step 2: Run** `npm test -- tests/app/components/CoachingModal`. Expected: FAIL.
- [ ] **Step 3: Implement.** Dialog sizing per Global Constraints. Layout is `flex-col` on phones and `lg:flex-row` with the board column `lg:w-[min(560px,…)]` and the thread column `flex-1 min-w-0`. The form is shown for a student with no thread, or for a coach when `responses.length === 0`. Hidden input `variation` is rendered only when the draft is non-null (`JSON.stringify`). Port the `ThreadView` and "just submitted" latch from `CoachingRequestModal`. Wire `LongThinks` to `CoachingModal mode="student"` via `dynamic`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS (update the existing `LongThinks` tests' import path if they reference the old modal).
- [ ] **Step 5: Commit** `feat: shared coaching modal with variations`

### Task 6: Cards open the modal, pages select variations, finish

**Files:**
- Modify: `app/components/CoachingThreadCard/index.tsx`, `app/components/CoachingAdminCard/index.tsx`, `app/[locale]/coaching/page.tsx`, `app/[locale]/admin/page.tsx`, `messages/{en,ru}.json` (`coaching.open` "Open"/"Открыть", `coachingAdmin.reply` "Reply"/"Ответить"), `specs/005-coaching-variations.md` (Status: done)
- Test: `tests/app/components/CoachingAdminCard/CoachingAdminCard.test.tsx`, `tests/app/components/CoachingThreadCard/CoachingThreadCard.test.tsx`

**Interfaces:**
- Consumes: `CoachingModal`, `CoachingThreadData` (Task 5).
- Produces: `CoachingThread` and `AdminCoachingRequest` are replaced by `CoachingThreadData` (+ `user_nickname` for admin). Both page queries select `variation` on the request and the responses.

- [ ] **Step 1: Write failing tests**
  - Admin card without a response: shows "Reply" and no inline textarea. Click → modal in `coach` mode.
  - Admin card with a response: shows "Open".
  - Thread card: "Open" → modal in `student` mode with the thread.
  - Card with a variation shows its notation line in the preview.
- [ ] **Step 2: Run** the new tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Cards hold `useState(open)` and mount the modal via `dynamic(..., { ssr: false })`. Admin orientation stays `sideToMove(fen)`. Student orientation is the side to move too (no stored user color). The modal close button sits outside the radix `asChild` chain (see `known-issues.md`).
- [ ] **Step 4: Run** `npm test && npm run lint && npm run build`. Expected: all pass, zero lint warnings.
- [ ] **Step 5: Apply the migration locally** (`npx supabase db reset` or `migration up`) and do a manual pass in Chrome at 1366×768, 375 px, 320 px and short landscape. Check that a student asks with a variation, the coach views it and replies with one, and the student steps through it on `/coaching` and on `/think-time`.
- [ ] **Step 6: Mark spec done, commit** `feat: coaching cards open the shared modal`
