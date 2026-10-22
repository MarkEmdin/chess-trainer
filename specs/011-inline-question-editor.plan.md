# Inline Question Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the textarea + single attached variation in the coaching modal with a Tiptap editor where board moves become inline move chips. It supports several lines, continuation chips after text, and per-position arrows and circles.

**Architecture:**

- **Pure core (no React):**
  - `lib/coaching/content.ts` holds the stored format, server validation and the plain-text rendering.
  - `lib/coaching/moveRecorder.ts` is a reducer that decides what each board move does to the text.
- **UI:**
  - `MoveEditor` is a thin Tiptap shell that applies the reducer's edits as chip nodes.
  - `VariationBoard` gains a writing mode and a drawing-aware viewer.
  - Server actions accept a `content` JSON field and rebuild `body` from it.

**Tech Stack:**

- Next.js 16, React 19, TypeScript strict;
- Tiptap 3 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/core`, `@tiptap/extension-document`, `@tiptap/extension-paragraph`, `@tiptap/extension-text`, `@tiptap/extensions`);
- react-chessboard 5.10, chess.js;
- Supabase;
- Jest + RTL.

**Spec:** `specs/011-inline-question-editor.md`

## Global Constraints

- Every line starts at the thread's key FEN. Limits:
  - `MAX_LINES = 10`;
  - `MAX_VARIATION_MOVES = 40` (existing constant, reused);
  - `MAX_CHIPS = 30`;
  - `MAX_BODY_LENGTH = 8000` (existing);
  - at most 20 arrows and 20 circles per drawing key.
- Drawing keys: `"key"` for the key position, `"<lineId>:<ply>"` otherwise (ply ≥ 1).
- `content.v === 1`. Old rows (`content` null) must render exactly as today.
- `body` is always rebuilt on the server from `content`. The client value is ignored when `content` is present.
- All copy goes through next-intl. `messages/en.json` and `messages/ru.json` keep the same tree (the `tests/messages.test.ts` check).
- Mark colour: `rgba(21, 120, 27, 0.85)` for arrows and circles.
- Follow `.claude/rules/conventions.md`: `cn()`, semantic tokens, `@/` imports, the feature folder `app/components/CoachingModal/`.

## Review Focus

1. A chip deleted with Backspace while active, then a board move → a new chip is inserted. It must not update a node that no longer exists.
2. Pasting rich HTML (including HTML copied from a chip) → arrives as plain text, with no chip node created.
3. A coach reply is validated against the **request's** FEN loaded on the server, never a FEN from the form.
4. Whitespace-only text with no chips → refused as `missingFields`. Chips with no text → accepted.
5. An old message with `variation` and null `content`, shown in the modal → the same text plus a "View" button as today.

Each item has a test in the owning task (marked **[RF n]**).

---

### Task 1: Stored content format and validation

**Files:**

- Create: `lib/coaching/content.ts`
- Test: `tests/lib/coaching/content.test.ts`

**Interfaces:**

- Produces:
  - `type Drawing = { arrows: [string, string][]; circles: string[] }`
  - `type MoveSegment = { t: 'moves'; line: string; from: number; to: number }`
  - `type Segment = { t: 'text'; text: string } | MoveSegment`
  - `type MessageContent = { v: 1; segments: Segment[]; lines: Record<string, string[]>; drawings: Record<string, Drawing> }`
  - `MAX_LINES = 10`, `MAX_CHIPS = 30`, `MAX_MARKS = 20`
  - `drawKey(line: string | null, ply: number): string` → `"key"` when `line` is null or `ply` is 0, else `` `${line}:${ply}` ``
  - `chipLabel(fen: string, moves: string[], from: number, to: number): string`. The first move always carries its number, later white moves carry theirs: `"4. c3 Nf6"`, `"3… d6 4. c3"`.
  - `contentToPlainText(fen: string, content: MessageContent): string`. Segments joined with no separator; a moves segment becomes its `chipLabel`.
  - `parseContent(raw: FormDataEntryValue | null, fen: string): MessageContent | null | 'invalid'`. Returns null when absent or empty.

- [ ] **Step 1: Write failing tests** (`content.test.ts`, FEN = Italian `r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3`):
  - `chipLabel(FEN, ['d6','c3','Nf6'], 1, 3)` → `'4. c3 Nf6'`; `(…, 0, 2)` → `'3… d6 4. c3'`; `(…, 2, 3)` → `'4… Nf6'`
  - `contentToPlainText` of `[text 'Хотел ', moves l1 0-1, text ' а потом ', moves l1 1-3, text '?']` → `'Хотел 3… d6 а потом 4. c3 Nf6?'`
  - `parseContent(null)` → `null`; `parseContent('not json')` → `'invalid'`; a valid JSON round-trips to an equal object
  - `'invalid'` for each of: `v: 2`; an illegal SAN in a line; a line of 41 moves; 11 lines; 31 moves segments; a segment whose `line` is missing; `from >= to`; `to > line length`; drawing key `l1:9` on a 3-move line; square `'z9'`; 21 arrows on one key
  - unknown extra keys on a segment are dropped (the output equals the input minus extras)
- [ ] **Step 2:** Run `npx jest tests/lib/coaching/content.test.ts` → FAIL (module not found)
- [ ] **Step 3:** Implement in `lib/coaching/content.ts`:
  - Reuse `playVariation` and `MAX_VARIATION_MOVES` from `@/lib/chess/variation`, and `formatMoveLabel` from `@/lib/chess/replay`.
  - `parseContent` rebuilds a clean object field by field instead of returning the parsed JSON.
- [ ] **Step 4:** Run the same command → PASS
- [ ] **Step 5:** Commit `feat: stored format for inline-move messages`

### Task 2: Migration and server actions take `content`

**Files:**

- Create: `supabase/migrations/20261023120000_coaching_content.sql`
- Modify: `lib/coaching/actions.ts`, `lib/coaching/types.ts`
- Test: `tests/lib/coaching/actions.test.ts`

**Interfaces:**

- Consumes: `parseContent` and `contentToPlainText` (Task 1).
- Produces:
  - `CoachingMessage` gains `content: MessageContent | null`.
  - Both actions read the form field `content`.

- [ ] **Step 1:** Migration: `alter table public.coaching_requests add column content jsonb check (content is null or jsonb_typeof(content) = 'object');`, the same for `coaching_responses`, plus a header comment in the style of `20261020120000_coaching_variations.sql`.
- [ ] **Step 2: Failing tests** in `actions.test.ts` (extend the existing supabase mock):
  - `createCoachingRequest` with a valid `content` and `body` = `'ignored'` → the insert receives `content` and the rebuilt `body` (`'Хотел 3… d6'`), with `variation: null`.
  - `createCoachingRequest` with an illegal line in `content` → `{ error: <invalidVariation> }`, no insert.
  - **[RF 4]** `content` with one text segment `'   '` and no moves → `missingFields`. `content` with only a moves segment → inserted.
  - **[RF 3]** `respondToRequest`: the mocked request FEN differs from a `fen` form field → validation uses the request's FEN. A line legal only from the form FEN is rejected.
  - Without `content`, old `body` + `variation` → behaves exactly as before (the existing tests keep passing).
  - The rebuilt `body` over 8000 characters → `bodyTooLong`.
- [ ] **Step 3:** Run `npx jest tests/lib/coaching/actions.test.ts` → the new tests FAIL.
- [ ] **Step 4: Implement.**
  - A shared helper `readMessage(formData, fen)` returns `{ body, variation, content } | { error: key }`:
    - when `content` parses, `body = contentToPlainText(...).trim()` and `variation = null`;
    - otherwise it falls back to today's path.
  - Both actions use the helper.
  - In `respondToRequest`, the helper runs after the request row is loaded.
  - `types.ts`: add `content` to `CoachingMessage`.
- [ ] **Step 5:** Run the tests → PASS. Run `npx tsc --noEmit` → clean.
- [ ] **Step 6:** Commit `feat: save inline-move content with questions and replies`

### Task 3: Move recorder reducer

**Files:**

- Create: `lib/coaching/moveRecorder.ts`
- Test: `tests/lib/coaching/moveRecorder.test.ts`

**Interfaces:**

- Consumes: `drawKey`, `chipLabel`, `MAX_LINES`, `MAX_CHIPS`, `MAX_MARKS` and the types from Task 1.
- Produces:
  - `type ChipRef = { line: string; from: number; to: number }`
  - `type RecorderState = { fen: string; lines: Record<string, string[]>; chips: Record<string, ChipRef>; drawings: Record<string, Drawing>; cursor: { line: string | null; ply: number }; active: string | null; typed: boolean; nextId: number }`
  - `initialRecorder(fen: string): RecorderState`
  - `type Edit = { kind: 'insert'; id: string; label: string } | { kind: 'relabel'; id: string; label: string } | { kind: 'remove'; id: string } | null`
  - `type RecorderError = 'illegal' | 'tooManyLines' | 'lineTooLong' | 'tooManyChips'`
  - `recordMove(s, from: string, to: string): { state: RecorderState; edit: Edit } | { error: RecorderError }`. Promotion is always a queen, as today.
  - `backToKey(s)`, `markTyped(s)`, `activateChip(s, id)`, `syncChips(s, presentIds: string[])` (drops chips missing from the doc; clears `active` if it is gone), `toggleMark(s, from, to)`, `clearDrawings(s)`: each `→ RecorderState`
  - `undoMove(s): { state: RecorderState; edit: Edit }`. Allowed only when the active chip ends at the end of its line; otherwise it returns `edit: null` and the state unchanged.
  - `canUndo(s): boolean`
  - `boardFen(s): string`, `boardLastMove(s): { from: string; to: string } | null`, `currentDrawing(s): Drawing`
  - `recorderContent(s, segments: Segment[]): MessageContent`. Keeps only the lines the segments reference and the drawings on those lines plus `"key"`.

- [ ] **Step 1: Failing tests:**
  - first move → `edit.kind === 'insert'`, label `'3… d6'`, cursor `{line: L, ply: 1}`
  - second move with `typed=false` → `relabel` of the same id to `'3… d6 4. c3'`
  - `markTyped` then move → `insert` of a new id, label `'4. c3'`, same line id, chip `{from: 1, to: 2}`
  - `backToKey` then move → a new line id, `insert` with label `'3… d6'` or the new SAN
  - `activateChip(first)` when a later chip continues the line, then move → a **new line** sharing the prefix; the old chips' refs are unchanged
  - **[RF 1]** `syncChips(s, [])` after one chip → `active === null`; the next move → `insert`, not `relabel`
  - `undoMove` on `'3… d6 4. c3'` → `relabel` `'3… d6'`, line length 1; `undoMove` again → `remove`, cursor back at the key; `canUndo` is false when the active chip is not at the line's tail
  - an illegal move → `{error: 'illegal'}`; the 41st move on a line → `lineTooLong`; an 11th line → `tooManyLines`; a 31st chip → `tooManyChips`
  - `toggleMark` twice on the same square → circle added, then removed; `from !== to` → arrow toggled; stored under `drawKey(cursor)`; the 21st circle is ignored
  - `recorderContent` drops an unreferenced line and its drawings and keeps `"key"`
- [ ] **Step 2:** Run `npx jest tests/lib/coaching/moveRecorder.test.ts` → FAIL
- [ ] **Step 3:** Implement as pure functions over immutable state. The move decision is the prototype's rule:
  - "extend" if the active chip is on the same line, ends at the cursor ply, and `typed` is false;
  - otherwise "insert";
  - moving with `ply < line length` forks a new line id.
- [ ] **Step 4:** Run the tests → PASS
- [ ] **Step 5:** Commit `feat: move recorder for inline variations`

### Task 4: Board drawing support

**Files:**

- Create: `lib/chess/drawing.ts`
- Modify: `app/components/ChessboardWithNotation/index.tsx`
- Test: `tests/lib/chess/drawing.test.ts`

**Interfaces:**

- Consumes: `Drawing` (Task 1).
- Produces:
  - `drawingSquareStyles(drawing: Drawing): Record<string, React.CSSProperties>`. A circle is a `backgroundImage` radial-gradient ring in the mark colour. It never sets `background` or `backgroundColor`, so the library's square colour and our last-move `backgroundColor` both survive.
  - `mergeSquareStyles(...styles: (Record<string, React.CSSProperties> | undefined)[])`: a shallow merge per square.
  - `ChessboardWithNotation` gets new optional props:
    - `arrows?: [string, string][]`, rendered with the mark colour; the library's own arrow drawing is turned off (`allowDrawingArrows: false`);
    - `onRightDrag?: (from: string, to: string) => void`, fired on right mouse up via `onSquareMouseDown`/`onSquareMouseUp`; `from === to` means a circle.
  - All handlers (`onPieceDrop`, `onSquareClick`, `onRightDrag`) are routed through a ref updated every render. react-chessboard keeps the first handlers it receives (found in the spike), so a comment explaining this goes in the code.

- [ ] **Step 1: Failing tests:**
  - `drawingSquareStyles({arrows: [], circles: ['e4']})` has `e4.backgroundImage` containing `radial-gradient` and no `backgroundColor`
  - `mergeSquareStyles({e4: {backgroundColor: 'y'}}, {e4: {backgroundImage: 'r'}})` → both keys kept
- [ ] **Step 2:** Run `npx jest tests/lib/chess/drawing.test.ts` → FAIL
- [ ] **Step 3:** Implement the helpers and the board props.
- [ ] **Step 4:** Run the tests plus the existing board tests: `npx jest tests/lib/chess tests/app/components/CoachingModal` → PASS
- [ ] **Step 5:** Commit `feat: arrows and circles on the board`

### Task 5: MoveEditor (Tiptap)

**Files:**

- Modify: `package.json` (`npm install @tiptap/react @tiptap/pm @tiptap/core @tiptap/extension-document @tiptap/extension-paragraph @tiptap/extension-text @tiptap/extensions`)
- Create: `app/components/CoachingModal/MoveEditor.tsx`, `app/components/CoachingModal/moveChip.ts` (the Tiptap node), `app/components/CoachingModal/editorDoc.ts`
- Modify: `messages/en.json`, `messages/ru.json`
- Test: `tests/app/components/CoachingModal/editorDoc.test.ts`, `tests/app/components/CoachingModal/MoveEditor.test.tsx`

**Interfaces:**

- Consumes: the Task 3 reducer.
- Produces:
  - `moveChip`: an inline atom node named `moveChip`, attrs `{ id: string; label: string }`. Renders as `<span data-chip="<id>" contenteditable="false" class="…chip classes…">label</span>`. `parseHTML` matches nothing, so a paste can never create a chip **[RF 2]**.
  - `docToSegments(json: JSONContent, chips: Record<string, ChipRef>): Segment[]`. Paragraphs are joined by `'\n'`, a hardBreak is `'\n'`, a `moveChip` with a known id becomes a moves segment, an unknown id is skipped. Also `chipIds(json): string[]`.
  - `MoveEditor` props:
    `{ fen: string; placeholder: string; recorder: RecorderState; onRecorderChange: (s: RecorderState) => void; onSegmentsChange: (segments: Segment[]) => void; onFocusChange: (focused: boolean) => void; registerMoveHandler: (fn: (from: string, to: string) => RecorderError | null) => void }`
  - The parent passes the board's move callback into `registerMoveHandler`. The editor applies each `Edit` to the doc:
    - `insert`: `insertContent` at the stored selection, followed by a space;
    - `relabel`: find the node by id and set its attrs;
    - `remove`: delete the node.
  - Our own transactions carry the meta `ownEdit`. Any other doc change or selection move calls `markTyped`. After each move, focus returns to the editor after 120 ms (dnd-kit restores focus to the piece after a drop; found in the spike).
  - `editorProps.handleClickOn` on a `moveChip` → `activateChip`. `onUpdate` → `syncChips(chipIds)` + `onSegmentsChange`.
  - `editorProps.transformPastedHTML` returns plain text, and `clipboardTextParser` stays default.
  - Under the editor:
    - "⟲ Back to key position — start a new variation" (`disabled` when the cursor is at the key);
    - "↶ Undo move" (`disabled={!canUndo}`);
    - a hint line;
    - a limit error line (`role="alert"`) for the last `RecorderError` other than `illegal`.
  - Active chip highlight: a `<style>` tag scoped to the editor wrapper, `[data-chip="<active>"] { ring }`.
- i18n `coaching.editor`:
  - `recording`: "● Recording — moves go into the text" / "● Идёт запись — ходы попадают в текст"
  - `startHint`: "Click the text field to start recording" / "Нажмите в поле текста, чтобы начать запись"
  - `backToKey`: "Back to key position — start a new variation" / "К ключевой позиции — начать новый вариант"
  - `undoMove`: "Undo move" / "Отменить ход"
  - `clearDrawings`: "Clear drawings" / "Стереть рисунки"
  - `hint`: "Play moves on the board to insert them. Right-click: circle, right-drag: arrow." / "Ходите на доске — ходы встанут в текст. Правая кнопка: кружок, протянуть — стрелка."
  - `errors.tooManyLines`: "Too many variations (max {max})" / "Слишком много вариантов (максимум {max})"
  - `errors.lineTooLong`: "Variation too long (max {max} moves)" / "Вариант слишком длинный (максимум {max} ходов)"
  - `errors.tooManyChips`: "Too many move chips (max {max})" / "Слишком много вставок ходов (максимум {max})"

- [ ] **Step 1: Failing tests:**
  - `editorDoc.test.ts`: `docToSegments` of two paragraphs `['Хотел ', chip c1]` and `['?']` → `[text 'Хотел ', moves(c1), text '\n?']`; an unknown chip id is skipped; `chipIds` lists the ids in order.
  - `MoveEditor.test.tsx` (renderWithIntl):
    - renders the placeholder;
    - "Back to key position" and "Undo move" are disabled for an initial recorder;
    - calling the registered move handler with `('d7','d6')` calls `onRecorderChange` with a state holding one chip, and the editor DOM contains a `[data-chip]` with text `3… d6`.
  - If ProseMirror needs layout APIs in jsdom, add `Range.prototype.getClientRects`/`getBoundingClientRect` stubs in that test file only.
- [ ] **Step 2:** Run `npx jest tests/app/components/CoachingModal/editorDoc.test.ts tests/app/components/CoachingModal/MoveEditor.test.tsx` → FAIL
- [ ] **Step 3:** Install the packages, add the messages, implement `moveChip.ts`, `editorDoc.ts` and `MoveEditor.tsx`. Tiptap setup: `useEditor({ immediatelyRender: false, extensions: [Document, Paragraph, Text, HardBreak?, Placeholder, UndoRedo, moveChip] })`. Use the HardBreak from `@tiptap/extension-hard-break` only if Enter should stay inside one paragraph; the default Enter makes a new paragraph, which `docToSegments` already handles, so skip it.
- [ ] **Step 4:** Run the tests → PASS. Run `npx jest tests/messages.test.ts` → PASS.
- [ ] **Step 5:** Commit `feat: move editor with inline chips`

### Task 6: Modal integration (writing and reading)

**Files:**

- Modify: `app/components/CoachingModal/index.tsx`, `app/components/CoachingModal/VariationBoard.tsx`
- Create: `app/components/CoachingModal/MessageContentView.tsx`
- Remove from the writing path: `DraftControls`, `Recorder`, and `useVariationRecorder` usage. Delete `useVariationRecorder.ts` and its test if nothing else imports them.
- Test: `tests/app/components/CoachingModal/CoachingModal.test.tsx`, `tests/app/components/CoachingModal/VariationBoard.test.tsx`

**Interfaces:**

- Consumes: Tasks 1, 3, 4 and 5.
- Produces:
  - `VariationBoard` props:
    - drops `canRecord`, `draft`, `onDraftChange` and `onRecordingChange`;
    - gains `writing: { fen: string; lastMove: {from,to} | null; drawing: Drawing; onMove: (from, to) => boolean; onSquareClick: (square) => void; onMark: (from, to) => void; onClearDrawings: () => void } | null`. When set: green `Frame`, interactive board, drawings, and a "Clear drawings" button. No player rows and no game nav.
  - `viewing` becomes `{ sans: string[]; line: string | null; startPly: number; drawings: Record<string, Drawing> } | null`. Old variations pass `{ sans: variation, line: null, startPly: 0, drawings: {} }`. The viewer starts at `startPly` and shows `drawings[drawKey(line, index)]` at each step.
  - `MessageContentView({ fen, content, activeChip, onChipClick: (seg: MoveSegment, id: string) => void })`: text with `whitespace-pre-wrap`, chips as `<button type="button">` with `chipLabel`.
- Modal behavior:
  - The recorder state lives in the modal (`useState(initialRecorder(fen))`).
  - `recording` turns true on editor focus and false on a mousedown outside both the editor box and the board column. This uses the document-capture listener from the spike, scoped to the dialog content.
  - While recording, `boardIndex` resets to `keyIndex` and `viewTarget` to null.
  - The form posts hidden `content` = `JSON.stringify(recorderContent(recorder, segments))` and hidden `body` = `contentToPlainText(...)`, which keeps the client counter.
  - Submit is disabled when the plain text is empty after trimming and there are no move segments.
  - The char counter counts the plain text.
  - In the thread, `content` messages render with `MessageContentView`. A chip click sets `viewing` to that chip's line with `startPly: seg.to`. Old messages keep `MessageBody` **[RF 5]**.

- [ ] **Step 1: Update and write failing tests** in `CoachingModal.test.tsx`. Mock `MoveEditor` with a stub that exposes a button "fake move" calling the registered handler with `('d7','d6')` and reports focus:
  - focusing the editor → the board frame has the green ring class (`data-testid="variation-board-frame"`);
  - "fake move" → the hidden `content` input JSON has one line `['d6']`, and the hidden `body` contains `3… d6`;
  - a thread whose question has `content` with a chip → clicking the chip button shows the viewer at ply 1 (the board position after `d6`);
  - **[RF 5]** a thread whose question has `variation: ['Nf6']` and `content: null` → the text plus a "View" button, as before;
  - the coach mode renders the same editor stub.
  - Update `VariationBoard.test.tsx` for the new props: a writing mode renders an interactive board with the ring; the viewer with `startPly: 2` shows the position after 2 moves; the drawing at `l1:2` adds the circle style.
- [ ] **Step 2:** Run `npx jest tests/app/components/CoachingModal` → the new tests FAIL.
- [ ] **Step 3:** Implement per the interfaces above.
- [ ] **Step 4:** Run `npx jest tests/app/components/CoachingModal` → PASS. Run `npx tsc --noEmit` → clean.
- [ ] **Step 5:** Commit `feat: inline move editor in the coaching modal`

### Task 7: Load `content` everywhere threads are read

**Files:**

- Modify: `app/[locale]/coaching/page.tsx`, `app/[locale]/admin/page.tsx`, `lib/coaching/useMyCoachingRequests.ts`, `app/components/CoachingThreadCard/index.tsx`, `app/components/CoachingAdminCard/index.tsx`
- Test: `tests/app/components/CoachingAdminCard/CoachingAdminCard.test.tsx`, plus a thread-card test if one exists

**Interfaces:**

- Consumes: `CoachingMessage.content` (Task 2).
- Every `select(...)` of `coaching_requests` and `coaching_responses` adds `content`, and every mapping passes it through.
- The card previews show `body`, which is already plain text with inline notation. They skip the separate variation line when `content` is non-null.

- [ ] **Step 1: Failing test:** `CoachingAdminCard` with `content` set and `variation: null` renders `body` and no separate variation line. The existing variation test still passes.
- [ ] **Step 2:** Run `npx jest tests/app/components/CoachingAdminCard tests/app/coaching tests/app/admin` → FAIL
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` → all PASS
- [ ] **Step 5:** Commit `feat: load inline-move content in thread lists`

### Task 8: Verify end to end and close the spec

- [ ] **Step 1:** Run `npm run lint`, `npm test` and `npm run build` → all pass with zero warnings.
- [ ] **Step 2:** In the browser at `npm run dev` → `/ru/think-time`, signed in:
  1. ask a question that mixes text and two lines, with a continuation chip and a circle;
  2. open the thread from `/ru/coaching` and click each chip;
  3. step through with ← →.
     Note: CDP drags can drop on the source square, so use tap-tap clicks for automated checks.
- [ ] **Step 3:** Tick the acceptance criteria in `specs/011-inline-question-editor.md` and set `Status: done`.
- [ ] **Step 4:** Commit `docs: mark spec 011 done`. Remind the user that the migration `20261023120000_coaching_content.sql` must be applied to prod with `supabase db push` before merging.
