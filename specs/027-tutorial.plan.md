# Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tutorial page, offered on the first visit and reachable from the navigation, the footer and the writing window.

**Architecture:** A static server page that reuses `LineDemo`, plus a client strip in the layout that reads one localStorage flag.

**Tech Stack:** Next.js 16, next-intl, `useSyncExternalStore`, Jest + RTL, Playwright (scratch only).

**Spec:** `specs/027-tutorial.md`

## Global Constraints

- No migration, no new dependencies. Both `messages/*.json` keep the same key tree.
- Button names in the copy must match `messages/*.json`.

## Review Focus

- localStorage unavailable (private mode): the strip must not crash the layout.
- A returning visitor: no flash of the strip on load.
- Five items in the phone tab bar at 360 wide: labels must not wrap.
- A logged-out visitor on `/tutorial`: no redirect to login.
- The link in the writing window must not end recording.

---

### Task 1: First visit strip

- [x] Write failing tests in `tests/app/components/FirstVisitPrompt/`. Run: FAIL.
- [x] Implement `useTutorialSeen` and `FirstVisitPrompt`, render it in the layout. Run: PASS.

### Task 2: Page and links

- [x] Write failing tests for the page, `SiteNav`, `Footer`, `CoachingModal`. Run: FAIL.
- [x] Implement. Run: PASS.
- [x] Check 393, 640 and 1280 wide in a browser.
- [x] `npm run lint`, `npm test`, `npm run build`. Commit.
