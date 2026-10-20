# Spec: Coaching variations and larger Q&A modal

Status: approved
Branch: feature/coaching-variations

## Problem

Coaching Q&A is cramped and text-only:

- The student asks in `CoachingRequestModal` (`sm:max-w-2xl`): the board is 240 px, the textarea 6 rows.
- The coach answers inline in `CoachingAdminCard` on `/admin` with a 200 px board.
- The student reads the thread in `CoachingThreadCard` on `/coaching` with a 200 px board.
- Explaining a line in prose ("if 15.e5 then Nd5, then…") is slow to write and hard to follow.
  Showing it on the board is much easier.

## Goal

- Both the student (in the question) and the coach (in the answer) can record **one variation** per
  message using a separate "Record variation" button. A message can contain text, a variation, or both.
- The reader of a message with a variation presses "View variation" and steps through it on the board.
- Asking, answering and reading happen in one large modal with a large board and a tall text field.
  It works at 375 px and 320 px widths and on short landscape screens.
- While recording, the board frame has a green glow, so it is obvious that moves are being recorded.

## Non-goals

- More than one variation per message; nested sub-variations; comments on individual moves.
- Follow-up messages (the student replying to the answer). Still one question, one answer per position.
- Editing a message after it is sent.
- Engine evaluation, arrows, square annotations.
- Playing moves in the `/games` game modal (separate roadmap item; may reuse this spec's pieces later).

## User-facing behavior

### Shared coaching modal (one component for all three entry points)

- Opened from: the "Ask the coach" button on a Key Positions card (`/think-time`, as today); a new
  "Open" button on each `/coaching` card (student); a new "Reply" / "Open" button on each `/admin` card
  (coach).
- Layout and sizing follow the `/games` game modal (spec 004): board up to 720 px and never taller
  than the viewport minus the controls; the dialog scrolls when space runs out. On desktop the board and the
  thread/form sit side by side when width allows. Otherwise the board goes on top and the text goes below.
- The textarea is at least 10 rows on desktop and 6 on phones, and stays resizable. It keeps the 4000-character limit.
- Cards on `/coaching` and `/admin` stay as small previews (200 px board). They stop hosting forms.

### Recording a variation (author: student before asking, coach before answering)

1. Below the board: a **"Record variation"** button. Pressing it enters recording mode:
   - The board frame gets a green glow (`ring` + green shadow) and a small "Recording variation" label.
   - Pieces become movable: drag-and-drop and tap-tap (tap a piece, then tap a target square, which
     matters on phones). Only legal moves are accepted (chess.js validates them). Illegal moves snap back.
   - Moves start from the message's position (`fen` of the request). Side to move comes from the FEN.
   - The recorded line shows under the board as move notation, e.g. `14… Nf6 15. e5 Nd5`.
2. Controls while recording: **Undo move**, **Clear**, **Done**.
   - Done leaves recording mode and keeps the line. The board returns to the start position. The glow goes away.
   - Done with 0 moves equals no variation.
3. After Done: the line is shown as an attached variation with **Edit** (re-enter recording,
   continuing from the line's last move) and **Remove**.
4. Submitting sends the text and the variation together. Text is still required. *(My call: keeps every
   message readable in the card preview; revisit if users want variation-only messages.)*
5. Pawn promotion auto-promotes to a queen. *(My call: avoids a picker UI; underpromotion is rare in
   coaching lines.)*
6. Max 40 half-moves per variation.

### Viewing a variation (reader: coach viewing the question, student viewing the answer)

- A message that has a variation shows its notation line and a **"View variation"** button.
- Pressing it puts the board in view mode. The board shows the variation's start position, and controls appear:
  first / previous / next / last (buttons + ←/→/Home/End keys, same as the game modal), and the
  last move's squares are highlighted. The current move is highlighted in the notation line, and each
  move in the line can be clicked to jump to it.
- **"Back to position"** returns the board to the question's position.
- Only one variation is shown on the board at a time. Opening the other message's variation switches the board to it.

## Data & types

- Migration `supabase/migrations/<timestamp>_coaching_variations.sql`:
  - `alter table coaching_requests add column variation text[]` (nullable; SAN moves).
  - `alter table coaching_responses add column variation text[]` (nullable).
  - Check constraint: `variation is null or cardinality(variation) between 1 and 40`.
  - No RLS changes: existing insert/select policies cover the new column.
- `lib/chess/variation.ts` (pure, framework-agnostic):
  - `playVariation(fen, sans) → { positions: string[]; moves: ReplayMove[] } | null`. Returns `null` if
    any move is illegal. Reuses `ReplayMove` / `formatMoveLabel` from `lib/chess/replay.ts`.
  - `formatVariation(moves) → string` for the one-line notation (`14… Nf6 15. e5 Nd5`).
- `lib/coaching/actions.ts`:
  - `createCoachingRequest` and `respondToRequest` read an optional `variation` form field (JSON array of
    SAN strings), validate it server-side with `playVariation(fen, …)` against the request's FEN, and
    store it. Invalid or too long → error `coaching.errors.invalidVariation`.
  - `respondToRequest` needs the request's `fen`: it selects it alongside the existing duplicate check.
- Types `MyCoachingRequest`, `CoachingThread`, `AdminCoachingRequest` gain `variation: string[] | null` on
  the request and on each response. The `/coaching` and `/admin` queries select the new columns.
- No new SWR hook. `useMyCoachingRequests` is unchanged apart from the selected columns.

## UI

- New feature folder `app/components/CoachingModal/` (replaces `CoachingRequestModal`):
  - `index.tsx`: the dialog. It has two modes, `student` and `coach`, and covers ask, answer and read-only thread.
  - `VariationBoard.tsx`: the board plus a state machine `idle | recording | viewing`, green glow, and nav controls.
  - `VariationLine.tsx`: notation with the current-move highlight and clickable moves.
  - `useVariationRecorder.ts`: recording state (moves, undo, clear) on top of `lib/chess/variation.ts`.
- `ChessboardWithNotation` gains optional interactive props (`allowDragging`, `onPieceDrop`,
  `onSquareClick`, extra `squareStyles`), which are off by default, so existing boards are unchanged.
- `CoachingThreadCard` and `CoachingAdminCard`: remove inline forms. Add an Open / Reply button that mounts the
  modal via `dynamic(..., { ssr: false })` (same pattern as `GameModal`). The response form moves into the
  modal; `CoachingResponseForm` is deleted or folded in.
- Everything in the modal is a client component (board interaction, keyboard nav).
- Green glow: `ring-2 ring-green-600 shadow-[0_0_16px] shadow-green-600/50` (universal "recording"
  semantics, allowed raw per conventions).

## i18n

New keys under `coaching.variation.*` in both `messages/en.json` and `messages/ru.json`:

- `record`: "Record variation" / "Записать вариант"
- `recording`: "Recording variation" / "Запись варианта"
- `undo`: "Undo move" / "Отменить ход"
- `clear`: "Clear" / "Очистить"
- `done`: "Done" / "Готово"
- `edit`: "Edit" / "Изменить"
- `remove`: "Remove" / "Удалить"
- `view`: "View variation" / "Посмотреть вариант"
- `backToPosition`: "Back to position" / "Назад к позиции"
- `attached`: "Variation" / "Вариант"

Plus `coaching.errors.invalidVariation`, `coaching.open` ("Open" / "Открыть"), and
`coachingAdmin.reply` ("Reply" / "Ответить").

## Acceptance criteria

- [ ] Student can ask with text + a recorded variation; the coach sees it and can step through it
- [ ] Coach can answer with text + a recorded variation from `/admin`; student sees it on `/coaching` and in
      the Key Positions modal, and can step through it
- [ ] Recording mode shows a green glow; leaving it removes the glow
- [ ] Illegal moves are rejected on the board; a tampered `variation` field is rejected server-side
- [ ] Tap-tap move input works on touch; modal usable at 375 px, 320 px and short landscape
- [ ] Messages without a variation look and behave as before (old rows have `variation = null`)
- [ ] Tests: `tests/lib/chess/variation.test.ts`, recorder hook, modal record/view flow, action validation
- [ ] `npm test`, `npm run lint` (zero warnings), `npm run build` pass
