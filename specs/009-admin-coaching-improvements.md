# Spec: Admin coaching improvements

Status: in-progress
Branch: feature/admin-coaching-improvements

## Problem

The coach (admin) answers questions from `/admin`, and it is awkward:

1. Nobody has checked on purpose that an account without admin rights cannot reach `/admin` or answer questions.
2. New questions and answered ones are mixed in one list. The question date is in tiny grey text.
3. In the answer modal it is unclear which color the student played. While stepping through the game the coach can't see the players or their clocks, which matter for judging a long think.
4. Board viewers only take ← → Home End. Lichess users expect ↑ (start) and ↓ (end).
5. Questions and answers are capped at 4000 characters. The user wants about 1000 words.

## Goal

- Non-admins (signed out, or signed in as `user`) are redirected away from `/admin`, and the reply action refuses them. This is covered by tests.
- `/admin` has two tabs, **New** and **Answered**, with counts. "New" is the default. Every card shows when the question was asked (date and time); answered cards also show when the answer was sent.
- In the coaching modal, the header says which color the student played. When the game is browsable, player rows above and below the board show name, rating, color, the clock at the shown position, and who is to move. The student's row is marked.
- ↑ jumps to the start and ↓ to the end in every board viewer: the game modal, game browsing in the coaching modal, and the variation viewer.
- Questions and answers accept up to 8000 characters (≈1000+ Russian words).

## Non-goals

- No change to RLS or roles; the audit found them correct (see below).
- No player rows for questions without a stored PGN (asked before spec 008). Their header still names the color.
- No clocks in the variation viewer or recorder: a variation is hypothetical, so it has no clock.
- No keyboard navigation for lesson boards, which have no move navigation at all.
- No pagination or search on `/admin`.
- No word counter: the limit stays in characters, only bigger.

## Access audit (done while writing this spec)

Three independent layers already protect the coach side:

1. `app/[locale]/admin/page.tsx` redirects to `/` unless `getAuthedUser().role === 'admin'`.
2. `respondToRequest` returns `notAdmin` for anyone else.
3. RLS: only `is_admin(auth.uid())` can read others' requests or insert responses. A user cannot change their own `role` (guarded in the initial schema).

The work: tests for layers 1 and 2, plus a manual check on production that signed-out `/en/admin` redirects.

## User-facing behavior

### `/admin`

- Tabs: "New (3)" / "Answered (12)". The tab lives in the URL (`?tab=answered`), so reloads and back/forward keep it. Server-rendered: no client state.
- Both tabs list newest first. *(Claude's call: same order as today.)*
- Card meta line: `14… Nf6 · asked by mark · 22 Oct 2026, 14:05` in normal-size muted text. Answered cards show "Answered 23 Oct 2026, 09:10" above the answer.
- An empty tab shows its own message ("No new questions" / "No answered questions yet").

### Coaching modal

- Header subtitle: coach sees "asked by mark · played White"; student sees "You played White". The color is the side to move in the key position, which is always the student's side.
- With a stored PGN, player rows sit above and below the board, as in the games modal: color dot, name, rating, "White · To move", clock. The student's row is bold and labeled "asked the question" (coach) or "you" (student). Data comes from PGN headers (`White`, `Black`, `WhiteElo`, `BlackElo`, `TimeControl`) and `[%clk]` comments, which Chess.com and Lichess both include. Missing pieces degrade: no Elo → no rating, no clocks → no clock.
- Rows show only while browsing the game, not while viewing or recording a variation.

### Keys

- ↑ = first position, ↓ = last position, the same as Home/End. They are ignored while typing in the textarea, as the other keys are, and `preventDefault` stops the dialog from scrolling.

## Data & types

- `lib/chess/pgnPlayers.ts` (new): `readPgnPlayers(pgn)` → `{ white, black }` with `{ name, rating? }`, and `readClockSnapshots(pgn)` → `ClockSnapshot[]` (index 0 = starting time from the `TimeControl` header).
- Move the clock-snapshot logic from `lib/chesscom/api.ts` into that module and have Chess.com reuse it (same behavior, one copy).
- `PlayerRow` moves out of `GameModal` into `app/components/PlayerRow/` so both modals share it. Gains an optional `note` (e.g. "asked the question").
- `MAX_BODY_LENGTH` 4000 → 8000. No migration: the DB has no length check.

## i18n

New keys (en/ru):
- `coachingAdmin.tabs.new` "New ({count})" / "Новые ({count})"
- `coachingAdmin.tabs.answered` "Answered ({count})" / "Отвеченные ({count})"
- `coachingAdmin.emptyNew` / `coachingAdmin.emptyAnswered`
- `coachingAdmin.askedAt` "asked {date}" / "задан {date}"
- `coachingAdmin.answeredAt` "Answered {date}" / "Ответ {date}"
- `coaching.playedAs` "played {color}" / "играл {color}"; `coaching.youPlayed` "You played {color}" / "Вы играли {color}"; colors come from `coaching.color.white|black` ("White"/"белыми", …)
- `coaching.players.asker` "asked the question" / "задал вопрос"; `coaching.players.you` "you" / "вы"
- `coachingAdmin.subtitle` changes to "Questions from students." (the list is no longer only open ones)

## Acceptance criteria

- [ ] `/admin` redirects for signed-out and `user`-role visitors (test)
- [ ] `respondToRequest` refuses non-admins (test)
- [ ] Tabs filter correctly, counts match, `?tab=answered` selects the second tab (test)
- [ ] Cards show question date+time; answered cards show the answer date
- [ ] Modal header names the student's color; player rows with clocks follow the browsed position (test)
- [ ] ↑/↓ go to start/end in GameModal, game browsing and the variation viewer (test)
- [ ] 8000-character comments are accepted (test)
- [ ] `npm run lint`, `npm test`, `npm run build` pass
