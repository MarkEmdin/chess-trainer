# Coaching Game Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix long coaching comments failing and getting wiped, and let student and coach browse the whole game in the coaching modal while writing and recording stay locked to the key position.

**Architecture:** A shared `normalizeBody` makes client and server count characters the same way. A controlled textarea survives React 19's post-action form reset. A nullable `pgn` column on `coaching_requests` is filled when a student asks a question. A pure `replayAroundKey` helper turns `(pgn, fen, moveIndex)` into positions, moves and a key index, and both the server validation and the modal use it. The modal owns `boardIndex`, and `VariationBoard` renders game navigation plus a `GameMoveList`, while the form locks whenever `boardIndex !== keyIndex`.

**Tech Stack:** Next.js 16, React 19 `useActionState`, Supabase (Postgres migration), chess.js, next-intl, Jest + RTL.

**Spec:** `specs/008-coaching-game-context.md`

## Global Constraints

- Body limit stays `4000`, counted after `\r\n` → `\n` normalization.
- Key move ★ = `moves[keyIndex]` (the move in the modal title). Clicking ★ goes to `positions[keyIndex]`, and at the key position the ★ move is the highlighted one.
- A broken or mismatched PGN must never block a question: store `pgn = null`.
- No stored PGN → the modal behaves exactly as today.
- New copy in both `messages/en.json` and `messages/ru.json` (the parity test enforces it). Use semantic color tokens and `cn()`.
- `npm run lint` zero warnings, `npm test`, `npm run build`.

## Review Focus

1. Arrow keys while typing in the textarea must not move the game board (the existing Viewer rule). Test in Task 4: `ignores arrow keys typed in the comment`.
2. An oversized PGN (> 100000 chars) must not fail the question: stored as null. Test in Task 3: `stores null pgn when it is too long`.
3. Viewing a sent variation and pressing "Back to position" must return to the key position, not to the move being browsed. Test in Task 4: `returns to the key position after viewing a variation`.
4. A server error after the user browsed away and back must still keep text and draft. Covered by Task 2's test plus Task 4's lock test (the text survives disabling).
5. A Chess960 or unparsable PGN shows no navigation (`buildReplay` returns 1 position, so `replayAroundKey` → null). Test in Task 3: `returns null for an unparsable pgn`.

---

### Task 1: Body normalization on the server

**Files:**
- Create: `lib/coaching/body.ts`
- Modify: `lib/coaching/actions.ts` (use helper in both actions; drop local `MAX_BODY_LENGTH`)
- Test: `tests/lib/coaching/body.test.ts`, `tests/lib/coaching/actions.test.ts`

**Interfaces:**
- Produces: `export const MAX_BODY_LENGTH = 4000;` and `export function normalizeBody(raw: string): string` (replaces `/\r\n?/g` with `\n`; does not trim).

- [ ] **Step 1: Failing tests.**
  - `body.test.ts`, `normalizeBody turns CRLF and CR into LF`: `expect(normalizeBody('a\r\nb\rc\n')).toBe('a\nb\nc\n')`.
  - `actions.test.ts`, `accepts a 4000-character question sent with CRLF line breaks`: body = `('x'.repeat(19) + '\r\n').repeat(200)` (4000 chars counted with `\n`, 4200 with `\r\n`). Expect `createCoachingRequest` → `{ success: true, requestId: 'new-id' }` and the inserted row's `body` contains no `\r`.
  - `actions.test.ts`, `accepts a 4000-character reply sent with CRLF line breaks`: same for `respondToRequest` → `{ success: true }`.
- [ ] **Step 2: Run** `npx jest tests/lib/coaching`. Expected: FAIL (module not found; the action tests get `bodyTooLong`).
- [ ] **Step 3: Implement.** In both actions: `const body = normalizeBody(String(formData.get('body') ?? '')).trim();`.
- [ ] **Step 4: Run** `npx jest tests/lib/coaching`. Expected: PASS.
- [ ] **Step 5: Commit** `fix: count comment length the same on client and server`

### Task 2: Form keeps text on error + character counter

**Files:**
- Modify: `app/components/CoachingModal/index.tsx`
- Modify: `messages/en.json`, `messages/ru.json` (`coaching.charCount`: en `"{count} / {max}"`, ru `"{count} / {max}"`)
- Test: `tests/app/components/CoachingModal/CoachingModal.test.tsx`

**Interfaces:**
- Consumes: `MAX_BODY_LENGTH`, `normalizeBody` from Task 1.

- [ ] **Step 1: Failing tests.**
  - `keeps the text and variation when the server returns an error`: `createCoachingRequest.mockResolvedValue({ error: 'boom' })`; type "My idea" into the `textbox`, `recordNf6()`, submit. `await` the alert `boom`; expect textbox value `'My idea'` and the text `Variation` (the draft label) still present.
  - `counts characters and blocks sending over the limit`: type `'a'.repeat(4001)` → text `4001 / 4000` visible with class `text-destructive`, submit button disabled; with `'a\nb'` → `3 / 4000`.
- [ ] **Step 2: Run** `npx jest tests/app/components/CoachingModal/CoachingModal.test.tsx`. Expected: the 2 new tests FAIL (text wiped, no counter).
- [ ] **Step 3: Implement.** Use a `const [body, setBody] = useState('')` controlled `Textarea` (`value`/`onChange`). Remove the `maxLength` attribute. Show the counter `t('charCount', { count, max })` with `count = normalizeBody(body).length` right-aligned under the textarea, `text-muted-foreground`, or `text-destructive` when over. Submit is disabled when `count > MAX_BODY_LENGTH`.
- [ ] **Step 4: Run** the same file. Expected: PASS, and the earlier tests still pass.
- [ ] **Step 5: Commit** `fix: keep coaching comment on server error and show length counter`

### Task 3: Store the game's PGN with a question

**Files:**
- Create: `supabase/migrations/20261021120000_coaching_pgn.sql`, containing `alter table public.coaching_requests add column pgn text check (pgn is null or length(pgn) <= 100000);` plus a comment line in the style of the variations migration.
- Modify: `lib/chess/replay.ts` (add `replayAroundKey`)
- Modify: `lib/coaching/actions.ts` (`createCoachingRequest` reads the optional `pgn`)
- Modify: `lib/coaching/types.ts` (`CoachingThreadData` + `pgn: string | null`, `move_index: number`)
- Modify the selects and mappers to include `pgn, move_index`: `lib/coaching/useMyCoachingRequests.ts`, `app/[locale]/coaching/page.tsx`, `app/[locale]/admin/page.tsx`
- Test: `tests/lib/chess/replay.test.ts` (create, or extend if present), `tests/lib/coaching/actions.test.ts`

**Interfaces:**
- Produces: `export function replayAroundKey(pgn: string, keyFen: string, moveIndex: number): { positions: string[]; moves: ReplayMove[]; keyIndex: number } | null`. `keyIndex = moveIndex - 1`. Returns null unless `positions[keyIndex] === keyFen` **and** `moves[keyIndex]` exists.
- Produces: `CoachingThreadData.pgn`, `CoachingThreadData.move_index`.

- [ ] **Step 1: Failing tests.**
  - `replay.test.ts`, using a short PGN `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6`. Its FEN after `2... Nc6` is the existing `BLACK_TO_MOVE`-style constant; derive it with chess.js in the test.
    - `returns positions, moves and the key index`: `replayAroundKey(pgn, fenBeforeMove5, 5)` → `keyIndex === 4`, `moves[4].san === 'Bb5'`.
    - `returns null when the fen does not match moveIndex`
    - `returns null for an unparsable pgn`: `replayAroundKey('garbage', fen, 1)` → null.
  - `actions.test.ts`:
    - `stores the pgn when it matches the asked position`: form with `pgn` whose position before move 5 equals `BLACK_TO_MOVE` → the inserted row has that `pgn`.
    - `stores null pgn when it does not match`: unrelated PGN → row `pgn: null`, result success.
    - `stores null pgn without the field` → row `pgn: null`.
    - `stores null pgn when it is too long`: valid PGN padded with a 100001-char `{comment}` → row `pgn: null`, success.
- [ ] **Step 2: Run** `npx jest tests/lib/chess tests/lib/coaching`. Expected: FAIL (`replayAroundKey` missing, `pgn` absent from the insert).
- [ ] **Step 3: Implement** `replayAroundKey` on top of `buildReplay(pgn, keyFen)`. In `createCoachingRequest`: `const rawPgn = String(formData.get('pgn') ?? '')`, then `pgn = rawPgn && rawPgn.length <= 100000 && replayAroundKey(rawPgn, fen, move_index) ? rawPgn : null`, and include `pgn` in the insert. Add `pgn, move_index` to the 3 selects and map them onto thread objects. Fix any test helpers that build a `CoachingThreadData` (e.g. `thread()` in `CoachingModal.test.tsx`: `pgn: null, move_index: 5`).
- [ ] **Step 4: Apply the migration locally** with `npx supabase migration up` (or `db reset` if that is the local habit; check `supabase/` docs or README). Expected: `pgn` column exists. Then run `npx jest tests/lib tests/app/components/CoachingModal`. Expected: PASS. Run `npx tsc --noEmit`. Expected: no errors.
- [ ] **Step 5: Commit** `feat: store the game pgn with a coaching question`

### Task 4: Browse the game in the modal, lock writing to the key position

**Files:**
- Create: `app/components/CoachingModal/GameMoveList.tsx`
- Modify: `app/components/CoachingModal/VariationBoard.tsx`, `app/components/CoachingModal/index.tsx`
- Modify: `messages/en.json`, `messages/ru.json`. Copy:
  - `coaching.game.backToKey`: en `"Back to key position"`, ru `"К ключевой позиции"`
  - `coaching.game.lockedBanner`: en `"On the board now: {move}. You can write and record variations only at the key position {keyMove}."`, ru `"Сейчас на доске: {move}. Писать ответ и записывать варианты можно только в ключевой позиции {keyMove}."`
  - `coaching.game.startPosition`: en `"starting position"`, ru `"начальная позиция"` (used for `{move}` at index 0)
- Test: `tests/app/components/CoachingModal/CoachingModal.test.tsx`

**Interfaces:**
- Consumes: `replayAroundKey` and `formatMoveLabel` (Task 3). `ReplayMove`.
- Produces:
  - `CoachingModal` prop `game?: { pgn: string; moveIndex: number }`. The modal computes `replay = useMemo(() => game ? replayAroundKey(game.pgn, fen, game.moveIndex) : null)` and owns `const [boardIndex, setBoardIndex] = useState(replay?.keyIndex ?? 0)`. `atKey = !replay || boardIndex === replay.keyIndex`.
  - Student ask form: hidden `<input name="pgn" value={game.pgn}>` when `game` is set and there is no thread.
  - `VariationBoard` new props: `game: { positions: string[]; moves: ReplayMove[]; keyIndex: number } | null`, `boardIndex: number`, `onBoardIndexChange: (i: number) => void`, `locked: boolean` (disables `DraftControls` buttons). Game navigation renders only in the idle branch (not Recorder, not Viewer). Keys ← → Home End move `boardIndex` and are ignored when the event target is a textarea or input.
  - `GameMoveList({ moves, keyIndex, boardIndex, onSelect })`: one button per move, labelled with `formatMoveLabel`. The key move gets a ` ★` suffix and `aria-label` ending in "★". Highlighted move = `boardIndex === keyIndex ? keyIndex : boardIndex - 1` (`aria-current="step"`). Click move `i` → `onSelect(i === keyIndex ? keyIndex : i + 1)`.
  - The "Back to key position" button sits under the board when `game` is set: `variant` is `default` when `!atKey` and `outline` when at key, and it is disabled at key. The same button appears in the banner.

- [ ] **Step 1: Failing tests** (fixture: PGN `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6`, `fen` = position before move 5 (`3. Bb5`), `game={{ pgn, moveIndex: 5 }}`, orientation white).
  - `opens on the key position with the key move starred`: board `data-position` equals `fen`; button named `/3\. Bb5 ★/` has `aria-current="step"`.
  - `locks writing away from the key position and keeps the text`: type "idea", click "Previous move" → banner text contains `2… Nc6` and `3. Bb5`; textbox, "Record variation" and "Send to coach" disabled; textbox value still "idea".
  - `back to key position unlocks`: after the step above, click the banner's "Back to key position" → no banner, textbox enabled, board at `fen`.
  - `clicking the starred move returns to the key position`: click `4. Ba4` then `3. Bb5 ★` → board at `fen`, no banner.
  - `ignores arrow keys typed in the comment`: `fireEvent.keyDown(textbox, { key: 'ArrowLeft' })` → board still at `fen`.
  - `returns to the key position after viewing a variation`: thread with a coach response variation `['Nf6']`. Browse back once, click "View variation", then "Back to position" → board at `fen`, no banner.
  - `sends the pgn with a new question`: submit → FormData `pgn` equals the fixture.
  - `shows no game navigation without a pgn`: no `game` prop → no "Back to key position" button (existing behavior).
- [ ] **Step 2: Run** the modal test file. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** per the Interfaces. The banner uses `role="status"`, `bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm`. `{move}` = `formatMoveLabel(moves[boardIndex - 1])` or `startPosition`, and `{keyMove}` = `formatMoveLabel(moves[keyIndex])`. Disable textarea, record/edit/remove buttons and submit while `!atKey`. Setting "View variation" and `onStopViewing` also does `setBoardIndex(keyIndex)`. While recording, game nav is not rendered (Recorder branch).
- [ ] **Step 4: Run** `npx jest tests/app/components/CoachingModal`. Expected: PASS (all old tests too).
- [ ] **Step 5: Commit** `feat: browse the whole game in the coaching modal`

### Task 5: Wire callers + neutral "Open game" link

**Files:**
- Modify: `app/components/LongThinks/index.tsx` (pass `game={{ pgn: coachingTarget.game.pgn, moveIndex: coachingTarget.think.moveIndex }}`, plus `gameUrl`)
- Modify: `app/components/CoachingThreadCard/index.tsx`, `app/components/CoachingAdminCard/index.tsx` (pass `game={thread.pgn ? { pgn: thread.pgn, moveIndex: thread.move_index } : undefined}` and `gameUrl={thread.game_url}`; card button label → `coaching.openGame`)
- Modify: `app/components/CoachingModal/index.tsx` (prop `gameUrl?: string` → external link `ExternalLinkIcon` + `t('openGame')`, `target="_blank" rel="noopener noreferrer"`, under the header description)
- Modify: `messages/en.json`, `messages/ru.json`: remove `coaching.viewOnChessCom` and add `coaching.openGame`: en `"Open game"`, ru `"Открыть партию"`
- Test: `tests/app/components/CoachingThreadCard/CoachingThreadCard.test.tsx`, `tests/app/components/CoachingAdminCard/CoachingAdminCard.test.tsx`, `tests/app/components/CoachingModal/CoachingModal.test.tsx`

- [ ] **Step 1: Failing tests.**
  - Modal: `links to the game when a url is given`: link `Open game` has `href` = given URL and `target="_blank"`.
  - Each card test: link named `Open game` with `href` = `game_url`. Update existing assertions that use "View on Chess.com".
- [ ] **Step 2: Run** those 3 files. Expected: FAIL.
- [ ] **Step 3: Implement** per Files.
- [ ] **Step 4: Run** `npm test`. Expected: all pass. Then `grep -rn viewOnChessCom app messages` → no hits.
- [ ] **Step 5: Commit** `feat: game link and browsing for every coaching entry point`

### Task 6: Verify and finish

- [ ] `npm run lint` (0 warnings), `npm test`, `npm run build`.
- [ ] Manual run against local Supabase (QA accounts `qa_student` / `qa_coach` exist locally). Ask a new question from Key Positions with a multi-paragraph ~3990-char comment, browse back and forth, check the lock, banner and ★, then send. As coach in /admin: browse the game, reply. An old question opens as before, with the link.
- [ ] Spec `Status: done`, check the acceptance boxes, commit `docs: mark spec 008 done`.
- [ ] PR body includes the prod rollout: **apply migration `20261021120000_coaching_pgn.sql` before merging/deploying**.
- [ ] `superpowers:finishing-a-development-branch`.
