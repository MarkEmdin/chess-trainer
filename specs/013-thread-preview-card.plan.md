# Thread Preview Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/think-time` card with a coaching thread previews the question and latest answer, and clicking it opens the coaching modal instead of a "View thread" button.

**Architecture:** `LongThinkCard` gets an optional `thread` prop and renders the preview instead of the button when it is set. The `LongThinks` container routes the card click to `openCoaching` when a thread exists, otherwise to the game modal.

**Tech Stack:** Next.js 16, next-intl, Tailwind v4, Jest + RTL

**Spec:** `specs/013-thread-preview-card.md`

## Global Constraints

- Preview texts are clamped with `line-clamp-2`; variations are not shown on the card.
- "Latest answer" = `thread.responses[thread.responses.length - 1]`.
- Copy reuses `coaching.yourQuestion`, `coaching.coachResponse`, `coaching.awaitingReply`; `coaching.viewThread` is removed from both locales.

## Review Focus

- Thread with several responses → the card shows the last one, not the first.
- Keyboard: Enter on a card with a thread opens the coaching modal (it goes through the same `onClick`).
- Signed-out user → no thread, card behaves as today.

---

### Task 1: Preview on the card

**Files:**
- Modify: `app/components/LongThinks/LongThinkCard.tsx`
- Modify: `messages/en.json`, `messages/ru.json` (drop `coaching.viewThread`)
- Test: `tests/app/components/LongThinks/LongThinkCard.test.tsx`

**Interfaces:**
- Produces: `LongThinkCard` prop `thread?: { body: string; responses: { body: string }[] }`

- [ ] **Step 1: Failing tests**
  - `shows the question and the latest answer` — thread `{ body: 'Why not e5?', responses: [{body:'old'},{body:'Because Nxe5.'}] }` → `Your question`, `Why not e5?`, `Coach's response`, `Because Nxe5.` visible; `old` absent.
  - `shows "Awaiting reply." with no answer yet`.
  - `hides the coaching button when there is a thread` — `showCoachingButton` true + thread → no `Ask coach`, no `View thread`.
  - `keeps "Ask coach" without a thread`.
- [ ] **Step 2:** `npm test -- LongThinkCard` → the new tests FAIL.
- [ ] **Step 3:** Implement: button renders only when `showCoachingButton && !thread`, and always says `askCoach`; preview under the date with `SectionLabel`.
- [ ] **Step 4:** `npm test -- LongThinkCard` → PASS.
- [ ] **Step 5:** Commit `feat: preview the coaching thread on key-position cards`.

### Task 2: Card click opens the thread

**Files:**
- Modify: `app/components/LongThinks/index.tsx`
- Test: `tests/app/components/LongThinks/LongThinks.test.tsx`

**Interfaces:**
- Consumes: `thread` prop from Task 1.

- [ ] **Step 1: Failing tests** (card mock exposes `onClick` as a second button `open`)
  - `opens the thread from a card that has one` — click `open` with a thread → `markResponseSeen('r1')` for an unseen one, modal stub shown.
  - `opens the game from a card without a thread` — `requestsByFen` without the fen → click `open` → modal shown, `markResponseSeen` not called.
- [ ] **Step 2:** `npm test -- LongThinks.test` → FAIL.
- [ ] **Step 3:** Implement: pass `thread={requestsByFen?.[think.fenBefore]}`; `onClick` = thread ? `openCoaching` : `setSelected`.
- [ ] **Step 4:** `npm test`, `npm run lint`, `npm run build` → all pass.
- [ ] **Step 5:** Commit `feat: open the coaching thread from the card itself`.
