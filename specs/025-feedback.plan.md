# Feedback from users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A footer dialog that delivers feedback to admins in Telegram.

**Architecture:** A server action validates and hands off to a new notify function that reports delivery; nothing is stored.

**Tech Stack:** Next.js 16 server actions, next-intl, Telegram bot code from spec 014, Jest + RTL.

**Spec:** `specs/025-feedback.md`

## Global Constraints

- No migration, no new dependencies. Both `messages/*.json` keep the same key tree.

## Review Focus

- Telegram's 4096 limit: text 2000, contact 100, page 300, device 200 stay under it.
- HTML in any field is escaped: `<b>` in text must not break `parse_mode: HTML`.
- No admin has Telegram linked: error, not fake success.
- Telegram config missing: error, not fake success.
- One blocked admin among several: still success if another got it.

---

### Task 1: Delivery

**Files:** `lib/feedback/types.ts`, `lib/feedback/actions.ts`, `lib/telegram/notify.ts`, `lib/telegram/messages.ts`, `messages/*.json`, tests under `tests/lib/`.

- [x] Write failing tests for `feedbackMessage`, `notifyAdminsOfFeedback`, `sendFeedback`. Run: FAIL.
- [x] Implement. Run: PASS. Commit.

### Task 2: Dialog

**Files:** `app/components/FeedbackDialog/index.tsx`, `app/components/Footer/index.tsx`, test under `tests/app/components/FeedbackDialog/`.

- [x] Write failing test. Run: FAIL.
- [x] Implement. Run: PASS.
- [x] `npm run lint`, `npm test`, `npm run build`. Commit.
