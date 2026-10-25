# Spec: Question & answer preview on key-position cards

Status: in-progress
Branch: feature/thread-preview-card

## Problem

On `/think-time`, a position the student already asked about shows a "View thread" button under the card. The card itself still opens the game, so seeing the coach's answer takes a separate button press, and the card says nothing about what was asked or answered.

## Goal

A card with a coaching thread shows a short preview of the question and the coach's answer right on the card. Clicking the card opens the coaching modal (full thread + game browsing), so the "View thread" button goes away.

## Non-goals

- Cards without a thread don't change: clicking opens the game modal, the "Ask coach" button stays.
- `/coaching` page cards (`CoachingThreadCard`) don't change.
- Variation lines are not shown on the card — only in the modal.

## User-facing behavior

Card with a thread (signed-in student):
- Header row unchanged: move, think time, status badge ("Question asked" / "New answer" / "Answered").
- Below the date: "Your question" label + question text clamped to 2 lines.
- "Coach's response" label + the latest response text clamped to 2 lines, or "Awaiting reply." in muted italic when there is none.
- No button. Clicking (or Enter/Space on) the card opens the coaching modal. An unseen answer is marked seen, same as before (spec 012).

Card without a thread: unchanged.

## Data & types

- No new data — `useMyCoachingRequests` already returns the thread per fen (`CoachingThreadData`), with `body` and `responses`.
- No migration.

## UI

- `app/components/LongThinks/LongThinkCard.tsx`: new optional `thread` prop. When present it renders the preview and hides the coaching button.
- `app/components/LongThinks/index.tsx`: passes `thread`; card click goes to `openCoaching` when a thread exists, otherwise to the game modal.

## i18n

- Reuse `coaching.yourQuestion`, `coaching.coachResponse`, `coaching.awaitingReply`.
- Remove `coaching.viewThread` from both locales (no remaining users).

## Acceptance criteria

- [ ] Card with a thread shows the question and the latest answer (or "Awaiting reply."), no button
- [ ] Clicking a card with a thread opens the coaching modal and marks an unseen answer seen
- [ ] Clicking a card without a thread still opens the game modal; "Ask coach" still works
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
- [ ] Tests under `tests/app/components/LongThinks/`
