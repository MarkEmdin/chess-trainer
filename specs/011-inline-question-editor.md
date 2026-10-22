# Spec: Inline question editor

Status: done
Branch: feature/inline-question-editor
Prototype: branch `spike/question-editor`, page `/ru/prototype/question-editor` (throwaway, never merged)

## Problem

Today a question has a plain textarea, and at most one variation is attached to it separately. To add the variation the student presses a "record" button off to the side, then the line shows up under the text. Text and moves are disconnected. The student can't write "I wanted to play X, but after Y I was afraid of Z", with the moves sitting in the sentence where they belong.

## Goal

- The student writes text, and **moves played on the board land in the text at the caret**, as clickable move chips.
- A green outline around the board shows that recording is on. Recording is on while the student is writing, with no separate button.
- One question can hold **several variations**. Each variation starts from the key position.
- Text typed between moves of one line **splits it into chips that read in order**: "I wanted `3… d6`, and then `4. c3 Nf6`?".
- Arrows and circles drawn on the board are saved together with the position they were drawn on.
- The reader (coach or student) clicks a chip, and the board shows that line with its drawings. It can be stepped through move by move.
- The coach's reply uses the same editor.

## Non-goals

- **Piece mention links** (the Alt+click `♘f3` from the prototype). Arrows and circles already let you point at a piece, and Alt+click is a hidden gesture. _(Claude's call; easy to add later because the data format leaves room for it.)_
- **Drawing on touch screens.** Right-click doesn't exist there. Moves work on phones (tap-tap), drawings don't. _(Claude's call.)_
- **Editing or converting old questions.** Questions saved before this spec keep rendering as today: text plus one variation underneath.
- **Variations that start anywhere other than the key position** (user's decision).
- **Rich text** (bold, lists, links). Only text, line breaks and move chips.
- **Clocks or engine evaluation inside variations.**

## User-facing behavior

### Writing (student question, coach reply)

The form sits in the existing coaching modal, under the thread. The modal's board is the recording board.

1. **Recording starts when the user clicks into the text field.** The board gets a thick green outline, and a green label above it says "● Recording — moves go into the text". If the modal was browsing the game (spec 008), the board jumps to the key position.
2. **Recording keeps going** through clicks on the board and its buttons. A click anywhere else in the modal stops it: the outline goes away, the board dims, and pieces can't be moved. The text stays as it is.
3. **A move on the board** (drag, or tap-tap) is inserted at the caret:
   - With nothing typed since the last move, and the caret where it was, the move extends the current chip: `3… d6` → `3… d6 4. c3`.
   - If text was typed or the caret moved, the move continues the same line in a **new chip at the caret**. Its first move carries its own number (`4. c3`, `4… Nf6`).
   - After a move, focus goes back to the text, so typing simply continues.
4. **Under the text field:**
   - **"⟲ Back to key position — start a new variation"**: the next move starts a new line from the key position.
   - **"↶ Undo move"**: removes the last move of the active chip. When the chip has no moves left, it disappears. _(Claude's call: the prototype had no way to fix a slipped move.)_
5. **Clicking a chip in the text** makes it active. The board shows the end of that chip, and the next move extends it. If the chip isn't at the end of its line (later chips continue it), the new move starts a **new line branching from that point**. The chips already in the text keep their moves.
6. **Backspace or Delete** removes a chip as one unit. A line that no chip references anymore is dropped on save.
7. **Drawing:** right-click on a square toggles a circle; right-drag toggles an arrow. A drawing belongs to the exact position the board shows (key position, or line + move). "Clear drawings" clears that position. One color. _(Claude's call: same green as in the prototype.)_
8. **Paste** inserts plain text only, never HTML or chips. _(Claude's call.)_
9. **Limits:** at most 8000 characters of text (unchanged from spec 009), at most 10 lines, at most 40 moves per line, at most 30 chips. When a limit is reached, the move is refused and a short message appears under the field.
10. **Send** is the same button and the same flow as today. Empty text with chips only is allowed. Completely empty is not.

### Reading (thread in the modal)

- Messages render as text with chips. Clicking a chip shows the board at that chip's last move, with its drawings. ← → step through the **whole line** (from the key position to the end of the line), ↑ ↓ jump to the start or end (spec 009). The active chip is highlighted.
- Leaving a line ("back to game" or closing it) works as it does today for a viewed variation.
- Old messages (`variation` column, no `content`) render exactly as today.

### Previews outside the modal

- `CoachingThreadCard` (My questions) and `CoachingAdminCard` (admin) show the text with moves written inline as plain notation ("I wanted 3… d6, and then 4. c3 Nf6?"). Chips there aren't clickable: you open the modal to play through them. _(Claude's call.)_

### Copy (en / ru)

- "● Recording — moves go into the text" / "● Идёт запись — ходы попадают в текст"
- "Click the text field to start recording" / "Нажмите в поле текста, чтобы начать запись"
- "Back to key position — start a new variation" / "К ключевой позиции — начать новый вариант"
- "Undo move" / "Отменить ход"
- "Clear drawings" / "Стереть рисунки"
- Hint under the field: "Play moves on the board to insert them. Right-click: circle, right-drag: arrow." / "Ходите на доске — ходы встанут в текст. Правая кнопка: кружок, протянуть — стрелка."
- Limit errors: "Too many variations (max 10)", "Variation too long (max 40 moves)", "Too many move chips (max 30)", plus Russian equivalents.

## Data & types

### Stored format

New nullable column `content jsonb` on `coaching_requests` and `coaching_responses`. A message with `content` is a new-style message; `variation` stays null for it.

```ts
// lib/coaching/content.ts
type MessageContent = {
  v: 1;
  // Text and chips in reading order. Text may contain '\n'.
  segments: (
    | { t: 'text'; text: string }
    | { t: 'moves'; line: string; from: number; to: number } // half-moves [from, to) of `line`
  )[];
  // SAN moves of each line, all from the thread's key FEN.
  lines: Record<string, string[]>;
  // Keyed "<line>:<ply>", or "key" for the key position.
  drawings: Record<string, { arrows: [string, string][]; circles: string[] }>;
};
```

`body` keeps holding **plain text** with moves written inline. Previews, the admin list and the length limit use it, and existing code that reads `body` keeps working.

### Validation (server action, shared pure function `parseContent`)

- Shape check plus `v === 1`.
- Every line plays legally from `fen` (`playVariation`) and is 1–40 moves long; at most 10 lines.
- Every segment `{line, from, to}` points at an existing line with `0 <= from < to <= length`. At most 30 move segments.
- Drawing keys point at an existing ply. Squares match `^[a-h][1-8]$`. At most 20 arrows and 20 circles per key.
- `body` is **rebuilt on the server** from `content`, never trusted from the client, then checked against `MAX_BODY_LENGTH`.
- Invalid content → `invalidVariation` error (existing key). Plain text with no chips → `content` is still stored (one text segment). _(Claude's call: one format going forward.)_

### Migration

`supabase/migrations/<ts>_coaching_content.sql`: `add column content jsonb` on both tables, with `check (content is null or jsonb_typeof(content) = 'object')`. No backfill. Prod rollout via `supabase db push` by the user (see project memory).

### Server actions

`createCoachingRequest` and `respondToRequest` read a `content` form field (JSON). The old `variation` field is no longer sent by the new form. The action keeps accepting it so an old tab still open during deploy doesn't break.

## UI

- **Editor engine: Tiptap (ProseMirror)** instead of hand-rolled `contentEditable`. A move chip is an inline atom node, which gives us undo/redo, a correct caret around chips, delete-as-unit, IME and paste handling for free. Only the core packages (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` with everything but paragraph, text and hard break turned off). It loads inside the modal chunk, which is already `dynamic(..., { ssr: false })`. _(Claude's call: the prototype showed how fragile caret handling is with raw contentEditable.)_
- `react-chessboard`: built-in arrow drawing off. Arrows and circles are controlled by us through `onSquareMouseDown`/`onSquareMouseUp` (right button) and rendered via `arrows` / `squareStyles`. Event handlers go through a ref, because the library keeps the first handlers it receives (found in the prototype).
- Components (feature folder, `app/components/CoachingModal/`):
  - `MoveEditor.tsx`: the Tiptap editor, the chip node, the buttons under it.
  - `useMoveRecorder.ts`: lines, chips, active chip, drawings. Pure logic with unit tests.
  - `MessageContentView.tsx`: read-only rendering with clickable chips.
  - Replaces `useVariationRecorder` and `VariationLine` usage for new messages. The old components stay for rendering old messages.
- Pure helpers in `lib/coaching/content.ts`: `parseContent`, `contentToPlainText`, `chipLabel`, `positionAt`.

## i18n

Under `coaching.editor.*`: `recording`, `startHint`, `backToKey`, `undoMove`, `clearDrawings`, `hint`, `errors.tooManyLines`, `errors.lineTooLong`, `errors.tooManyChips`. Both locales, same tree.

## Acceptance criteria

- [x] Clicking into the text turns recording on (green outline); a click elsewhere in the modal turns it off
- [x] A board move inserts a chip at the caret; consecutive moves extend it; text in between starts a new chip on the same line (test on the recorder)
- [x] Back to key position starts a new line; Undo move shrinks or removes the active chip (test)
- [x] Clicking a middle chip and moving branches a new line without changing existing chips (test)
- [x] Drawings are saved per position and show when reading that position
- [x] The server rejects illegal lines, bad ranges, bad squares and over-limit content; `body` is rebuilt from `content` (tests on `parseContent` and actions)
- [x] The coach reply uses the same editor
- [x] Old messages render unchanged; the cards show inline plain notation for new ones
- [x] Migration file added; `npm run lint`, `npm test`, `npm run build` pass
