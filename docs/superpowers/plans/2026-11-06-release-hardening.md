# Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the release blockers from the 2026-11-06 review and the smaller gaps around them.

**Architecture:** One migration holds every database rule. Actions translate its errors. The UI renders each answer on its own.

**Tech Stack:** Supabase Postgres, Next.js server actions, Jest.

**Spec:** `specs/030-release-hardening.md`

## Global Constraints

- Prod migrations are applied by the user, never by the agent.
- `messages/{en,ru}.json` keep the same key tree.

## Review Focus

- A row with duplicate `(request_id, author_id)` on prod blocks the unique index: the user checks before pushing.
- A profile save must not touch a column outside the new grant.
- The trigger must work for coaches, who cannot update `coaching_requests`: it runs as definer.
- `withAuthors` must keep answers oldest first whatever order PostgREST returns.
- Feedback must still go through when the throttle check errors.

---

### Task 1: Migration

Files: `supabase/migrations/20261107120000_release_hardening.sql`. Apply to the local stack, run the rolled-back probes, confirm profile writes pass.

### Task 2: Several answers

Files: `lib/coaching/actions.ts`, `lib/coaches/authors.ts`, `app/components/CoachingAdminCard/index.tsx`, `app/components/CoachingModal/index.tsx`, `app/components/CoachingThreadCard/index.tsx`. Tests: `tests/lib/coaching/actions.test.ts`, `tests/lib/coaches/`.

### Task 3: Errors, approval, feedback

Files: `lib/actionError.ts`, `lib/auth/actions.ts`, `lib/auth/profileActions.ts`, `lib/coaches/actions.ts`, `lib/coaching/actions.ts`, `lib/feedback/actions.ts`, `messages/*.json`, with their tests.

### Task 4: Speed

Files: `lib/games/longThinks.ts` (use `move.before`, drop the replay), `lib/supabase/middleware.ts` (`getSession` for the refresh; pages still verify with `getUser`).

### Task 5: Next.js 16.4.5

Run `npm i next@16.4.5 eslint-config-next@16.4.5`, then test, lint, build.
