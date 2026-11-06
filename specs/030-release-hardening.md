# Spec: release hardening

Status: done
Branch: fix/release-hardening

## Problem

A review before inviting about 20 users found that a student can make themselves
admin, anyone can read an email by nickname, two coaches answering the same
question break the single-answer assumption, and `next` 16.2.1 has critical
advisories. Smaller gaps: direct inserts skip validation, guest feedback has no
limit, raw English errors reach the UI, coach approval is not atomic, and
`/think-time` and signed-in pages are slower than they need to be.

## Goal

- A student cannot change their role or read other users' emails.
- Every answer to a question is shown, each signed by its author. One coach
  cannot answer the same question twice.
- A second answer shows the student as new again.
- `next` is on 16.4.5.
- The database rejects what the actions reject: oversized text, bad URLs,
  malformed `content`, and server-owned columns.
- One address sends at most 5 feedback messages per hour.
- Users see translated errors; the raw text goes to the server log.
- Approving a coach is one transaction.

## Non-goals

- "Coach X took this question" claiming.
- Threaded replies: the form still closes once an answered thread is loaded.
- Loading PGNs on demand on `/admin` and `/coaching`.
- A Web Worker for `/think-time`.

## User-facing behavior

Two coaches press send at once, or one sends after the other from a stale page:
both answers are saved, listed oldest first, each under its coach's name, each
with its own like. The student gets a Telegram message per answer. The same
coach sending twice gets "You have already answered this question".

## Data & types

Migration `20261107120000_release_hardening.sql`:

- `user_profiles` UPDATE only on `chesscom_username`, `lichess_username`,
  `preferred_locale`, `telegram_prompt_dismissed`, `show_in_leaderboard`.
- `lookup_email_by_nickname` for `service_role` only.
- INSERT on `coaching_requests` and `coaching_responses` only on the columns the
  actions write.
- Checks, `not valid` so old rows stay: body length up to 8000, `game_url`
  `https://`, `move_index` not negative, `content.segments` is an array.
- Unique `(request_id, author_id)` on `coaching_responses`.
- Trigger: a new answer clears `coaching_requests.response_seen_at`.
- `approve_coach_application(uuid)` and `allow_feedback(text, int)`, service role
  only, with table `feedback_throttle`.

## i18n

`common.serverError`, `auth.errors.tooManyAttempts`, `auth.errors.invalidEmail`,
`feedback.errors.tooMany`.

## Acceptance criteria

- [x] As `authenticated`, updating `role` fails
- [x] As `anon` and `authenticated`, calling `lookup_email_by_nickname` fails
- [x] Saving a profile, language, Telegram dismissal and signing in still work
- [x] Two coaches can answer one question; both show in order, signed
- [x] The same coach answering twice gets `alreadyResponded`
- [x] A second answer brings back the student's "new" badge
- [x] Direct inserts with a 2 MB body or `{"junk":true}` content fail
- [x] A sixth feedback message in an hour is refused; a failed check lets it through
- [x] `npm test`, `npm run lint`, `npm run build` pass
