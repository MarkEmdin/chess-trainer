# Clear Promise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A first screen that promises a real coach, and a guest path that survives signing up.

**Architecture:** Copy and `LineDemo` on the landing; one localStorage key for the position; `GamesShell` moves a remembered nickname into the profile.

**Tech Stack:** Next.js 16, next-intl, Jest + RTL, Playwright (scratch only).

**Spec:** `specs/028-clear-promise.md`

## Global Constraints

- No migration, no new dependencies. Both `messages/*.json` keep the same key tree.
- No claim about price.

## Review Focus

- A nickname already in the profile must never be replaced.
- "Change user" after taking the remembered nickname must not bring it back.
- A remembered position that isn't loaded: no crash, and the key is not left to fire later.
- Storage off: asking still leads to `/register`.
- The sample on the landing at 360 wide: no horizontal scroll.

---

### Task 1: Landing

- [x] Update `tests/app/page.test.tsx`. Run: FAIL.
- [x] Rewrite the first screen and copy. Run: PASS.

### Task 2: Guest path

- [x] Write failing tests for `pendingAsk`, `PositionDetail`, `LongThinks`, `GamesShell`, email-confirmed. Run: FAIL.
- [x] Implement. Run: PASS.

### Task 3: Finish

- [x] Check 360, 768 and 1280 wide in a browser.
- [x] `npm run lint`, `npm test`, `npm run build`. Commit, push, update PR #34.
