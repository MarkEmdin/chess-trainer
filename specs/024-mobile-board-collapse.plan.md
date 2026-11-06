# Hiding the board on a phone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a phone the window can always be closed, the board can be hidden, and send stays reachable.

**Architecture:** All changes live in `CoachingModal/index.tsx`: a pinned bar outside the board column, a `boardHidden` flag that hides the column with CSS so its state survives, and a `pinned` value that decides whether the column is sticky.

**Tech Stack:** Next.js 16, Tailwind v4, next-intl, Jest + RTL, Playwright (scratch only).

**Spec:** `specs/024-mobile-board-collapse.md`

## Global Constraints

- Desktop (`lg` and up) is unchanged. No data changes. No new dependencies.
- Both `messages/*.json` keep the same key tree.

## Review Focus

- The board is hidden, then recording ends: "Show board" is still reachable, because the bar is always there.
- A move recorded before hiding: after "Show board" the board shows that position, because the column is hidden, not unmounted.
- A board shown again after `display: none` has its full size (emulation).
- Tapping the bar while typing keeps the keyboard (emulation; `mousedown` is cancelled).
- The sticky send row does not cover the caret line (emulation).

---

### Task 1: Top bar and hiding the board

**Files:** Modify `app/components/CoachingModal/index.tsx`, `messages/en.json`, `messages/ru.json`. Test `tests/app/components/CoachingModal/CoachingModal.test.tsx`.

- [x] Write failing tests under `by screen width`, narrow: one close button in the bar; "Hide board" hides the board and keeps recording; a chip tap and a game move bring it back; wide shows no bar.
- [x] Run `npx jest CoachingModal.test`: FAIL.
- [x] Add keys, bar, `boardHidden`, `pinned`, sticky send row.
- [x] Run `npx jest CoachingModal.test`: PASS.
- [x] Commit.

### Task 2: Tune on a phone-sized screen

- [x] Emulate 393×760 and 393×460 with Playwright: bar sticks, send visible, two lines of text with the keyboard open, board size after show, desktop unchanged.
- [x] Retune the board cap if needed. Commit.
- [x] `npm run lint`, `npm test`, `npm run build`.
