# Guided Question Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The student's new-question form becomes three steps (candidate moves, what held them back, optional question) that are joined into one ordinary message.

**Architecture:** A pure `composeGuidedContent` turns the step 1 editor content, the picked reasons and the step 3 text into one `MessageContent`. `CoachingModal` renders the steps in student-ask mode and feeds the composed content to the existing hidden `content`/`body` inputs and the counter. Drafts gain two optional fields. No server or DB change.

**Tech Stack:** Next.js 16, next-intl, Tiptap editor (existing `MoveEditor`), Jest + RTL.

**Spec:** `specs/039-guided-question.md`

## Global Constraints

- Only the student's form for a new question changes (`mode === 'student' && canWrite`). Coach reply form and thread views stay byte-identical.
- Reason ids, in this order: `noPlan`, `threat`, `calculation`, `choice`.
- Composed lines, in this order, empty steps left out, joined with `\n`: `<prefix.candidates> <step 1 segments>`, `<prefix.reasons> <labels joined ", ", first letter lower-cased>`, `<prefix.question> <trimmed step 3 text>`.
- Copy exactly as in the spec's i18n table, under `coaching.guided.*`; `messages/en.json` and `messages/ru.json` keep the same key tree.
- Send enabled iff composed plain text is non-empty and `<= MAX_BODY_LENGTH`.

## Review Focus

- Student picks only a reason, types nothing in the editor → draft still saved and restored. Test in Task 3.
- Server returns an error → reasons and step 3 text stay (React resets uncontrolled form fields after an action, so the step 3 textarea must be controlled). Test in Task 3.
- Step 1 holds only whitespace → no "Candidates:" line. Test in Task 1.
- Reason toggles are `type="button"`: pressing one never submits the form. Test in Task 3.
- Draft saved by the previous release (no `reasons`/`question`) still loads. Test in Task 2.

---

### Task 1: `composeGuidedContent` + reason ids

**Files:**
- Create: `app/constants/questionReasons.ts`
- Create: `lib/coaching/guidedQuestion.ts`
- Test: `tests/lib/coaching/guidedQuestion.test.ts`

**Interfaces:**
- Produces:
  - `QUESTION_REASONS = ['noPlan', 'threat', 'calculation', 'choice'] as const`, `type QuestionReason = (typeof QUESTION_REASONS)[number]`, `isQuestionReason(v: unknown): v is QuestionReason`
  - `type GuidedSteps = { candidates: MessageContent; reasons: QuestionReason[]; question: string }`
  - `type GuidedLabels = { candidates: string; reasons: string; question: string; reason: (r: QuestionReason) => string }`
  - `composeGuidedContent(steps: GuidedSteps, labels: GuidedLabels): MessageContent`

- [ ] **Step 1: Write the failing tests** (labels: `Candidates:`, `Held me back:`, `Question:`, reason → `Couldn't see a plan` etc.)
  - `'joins all three steps, one line each'`: candidates `[text 'Maybe ', moves l1 0..1]` with `lines {l1:['Nf6']}` and a `key` drawing, reasons `['calculation','noPlan']`, question `'  why not e5?  '` → segments `[text 'Candidates: ', text 'Maybe ', moves l1, text "\nHeld me back: couldn't see a plan, couldn't calculate it", text '\nQuestion: why not e5?']`; `lines` and `drawings` equal the candidates'. (Reasons follow `QUESTION_REASONS` order, not click order.)
  - `'leaves out empty steps'`: only question `'x'` → segments `[text 'Question: x']`, no leading `\n`.
  - `'treats whitespace-only step 1 as empty'`: candidates `[text '  \n ']`, reasons `['threat']` → plain text (`contentToPlainText`) `'Held me back: worried about a threat'`.
  - `'returns no segments when every step is empty'` → `segments: []`.

- [ ] **Step 2: Run** `npx jest tests/lib/coaching/guidedQuestion.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement** both files. Step 1 counts as filled when it has a `moves` segment or a text segment with non-whitespace. Each later line's text segment starts with `\n` only if a line precedes it.

- [ ] **Step 4: Run** the same command — Expected: PASS.

- [ ] **Step 5: Commit** `feat: compose a guided question into one message`

### Task 2: Drafts keep reasons and question

**Files:**
- Modify: `lib/coaching/drafts.ts` (`Draft` type, `loadDraft`)
- Test: `tests/lib/coaching/drafts.test.ts`

**Interfaces:**
- Consumes: `isQuestionReason` (Task 1)
- Produces: `Draft = { savedAt; doc; recorder; reasons?: QuestionReason[]; question?: string }`. `loadDraft` returns `reasons` filtered by `isQuestionReason` when the stored value is an array (otherwise `undefined`), and `question` only when it is a string (otherwise `undefined`).

- [ ] **Step 1: Write the failing tests** in `describe('loadDraft / saveDraft')`:
  - `'round-trips reasons and the question'`: save with `reasons: ['threat']`, `question: 'why?'` → loaded draft has both.
  - `'drops unknown reasons'`: raw stored `reasons: ['threat', 'bogus', 3]` → `['threat']`.
  - `'loads a draft saved without reasons or question'`: → `reasons` and `question` are `undefined`, doc and recorder load as before.

- [ ] **Step 2: Run** `npx jest tests/lib/coaching/drafts.test.ts` — Expected: the first two FAIL.

- [ ] **Step 3: Implement** in `loadDraft`; `saveDraft` already spreads whatever it gets.

- [ ] **Step 4: Run** — Expected: PASS.

- [ ] **Step 5: Commit** `feat: drafts keep the guided steps`

### Task 3: The three-step form

**Files:**
- Create: `app/components/CoachingModal/ReasonPicker.tsx`
- Modify: `app/components/CoachingModal/index.tsx` (student-ask form, lines ~500–575; content/plainText near line 158; draft save near line 186)
- Modify: `messages/en.json`, `messages/ru.json` (add `coaching.guided.*`; remove now-unused `coaching.bodyLabel` and `coaching.bodyPlaceholder`; tutorial `tutorial…write.text` → "Нажмите в первое поле…"/"Tap the first field…", rest of the sentence unchanged)
- Test: `tests/app/components/CoachingModal/CoachingModal.test.tsx`

**Interfaces:**
- Consumes: `composeGuidedContent`, `QUESTION_REASONS`, `QuestionReason` (Task 1); `Draft.reasons`, `Draft.question` (Task 2)
- Produces: `ReasonPicker({ value: QuestionReason[]; onChange(next: QuestionReason[]): void })` — one `<Button type="button" variant={on ? 'default' : 'outline'} size="sm" aria-pressed={on}>` per reason, inside a `role="group"` labelled by `coaching.guided.reasonsLabel`.

- [ ] **Step 1: Update the test helper and existing tests.** `editor()` becomes `document.querySelector('#stub-editor') as HTMLTextAreaElement` (the form now has two textboxes). Student-ask tests that assert `body` now expect the `Candidates: ` prefix (e.g. `'Candidates: Is this fine? 3… Nf6'`, restored draft `'Candidates: Is this fine?'`); the counter test expects `'Candidates: a\nb'.length` etc. Coach-mode tests unchanged.

- [ ] **Step 2: Write the failing tests** (new `describe('guided question')`, `askProps` as in the drafts block):
  - `'shows the three steps to a student asking'`: labels `1. Which moves did you consider?`, group `2. What held you back?` with 4 buttons `aria-pressed="false"`, textbox `3. What do you want to ask the coach? (optional)`.
  - `'keeps the coach reply form as it was'`: coach mode with an unanswered thread → no reasons group, no step 3 box.
  - `'sends with only a reason picked'`: Send disabled → click `Couldn't calculate it` (now `aria-pressed="true"`, `createCoachingRequest` not called) → Send enabled → submit → `body` `"Held me back: couldn't calculate it"`.
  - `'sends all three steps as one message'`: editor `'Maybe '` + `playNf6()`, reasons `threat`, step 3 `'why not e5?'` → `body` `"Candidates: Maybe 3… Nf6\nHeld me back: worried about a threat\nQuestion: why not e5?"`, sent content lines `[['Nf6']]`.
  - `'keeps reasons and question after a server error'`: error response → reason still pressed, step 3 value kept.
  - `'saves reasons and question in the draft and restores them'`: pick only a reason + type step 3, unmount, re-render → both restored (draft saved even though the editor was never touched).
  - `'counts the whole message'`: step 3 `'a'.repeat(8000)` → counter `8010 / 8000` destructive, Send disabled.

- [ ] **Step 3: Run** `npx jest tests/app/components/CoachingModal` — Expected: new tests FAIL, updated ones FAIL until the prefix exists.

- [ ] **Step 4: Implement.** In student-ask mode: `reasons`/`question` in `useState`, seeded from `draft`; `content = composeGuidedContent({ candidates: recorderContent(...), reasons, question }, labels)` (else the old `recorderContent`); `plainText`, the counter and the hidden inputs use it. Editor label/placeholder → `guided.candidatesLabel`/`guided.candidatesPlaceholder` (header row keeps the "How to fill this in?" link). Step 3 is a controlled `<textarea>` styled like the feedback dialog's, with a `<label>`. Draft save also runs when `reasons`/`question` change; with no editor doc yet it saves `{ type: 'doc', content: [{ type: 'paragraph' }] }`. Reply mode renders exactly as before.

- [ ] **Step 5: Run** `npx jest tests/app/components/CoachingModal` then `npm test` — Expected: all PASS.

- [ ] **Step 6: Run** `npm run lint` and `npm run build` — Expected: zero warnings, build OK.

- [ ] **Step 7: Commit** `feat: three-step guided question form`, then tick the spec's acceptance criteria and set `Status: done` in a `docs:` commit.
