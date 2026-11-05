# Spec: Weekly question leaderboard

Status: done
Branch: feature/leaderboard

## Problem

Students have no visible reason to ask coaches more questions, and a plain
"most questions" ranking would reward spam. Separately, a coach sees their own
questions in the staff queue, next to the questions they are meant to answer.

## Goal

A `/leaderboard` page ranks students by the likes coaches gave their questions
over the last 7 days. Every answer carries a like by default and the coach
removes it from a question that doesn't deserve one, so a question only scores
if a coach answered it and left the like in place. Coaches stop seeing their
own questions in the staff queue.

## Non-goals

- Dislikes. There is no such feature, in the UI or in the data.
- Bell or Telegram notifications about likes or leaderboard places.
- All-time or monthly rankings, and an archive of past weeks.
- Leaderboards per coach or per group.
- A public leaderboard for guests.

## User-facing behavior

### Likes

- When a coach answers a question, the answer is liked automatically.
- On an answered card in `/admin`, staff who can see the question can remove
  the like and put it back. One question gives at most one like.
- Staff can't change the like on their own question.
- All questions already answered get a like when the migration runs.
- The student sees the like on the answer in their own thread. No like means no
  mark; there is no "removed" state to see.

### Leaderboard page

- Signed-in users open `/leaderboard`; guests are redirected to `/login`.
- A link appears in `SiteNav`, on desktop and in the mobile tab bar.
- The list shows up to the top 20 places: place, nickname, likes.
- Places 1–3 show a gold, silver and bronze cup instead of the number.
- Equal likes share a place: 7, 5, 5, 3 gives places 1, 2, 2, 4. Both tied
  students get the cup of that place, and a tie at place 20 shows everyone tied.
  Tied rows are ordered by nickname so the list is stable.
- Your own row is highlighted. If it falls outside the list, it is pinned below
  the list after a `···` row.
- With 0 likes this week you aren't listed and no row is pinned.
- If nobody has a like this week, the page shows an empty state.

### Who is ranked

- Students and coaches. Coaches ask questions too, and stronger coaches answer
  them. The admin never appears.
- Anyone ranked can hide themselves with a checkbox in `/profile`. Hidden people
  aren't listed and don't take up a place, and they see no pinned row.

### The week

The window is the rolling last 7 days, measured by when the answer was written
(`coaching_responses.created_at`), not when the question was asked. Old answers
therefore get a like but drop out of the ranking on their own, so the first
week isn't flooded. Removing or restoring a like changes the ranking at once.

### Coach's own questions

Staff (admin and coaches) don't see their own questions in the `/admin` queue,
in the bell's "new questions" count, or in the Telegram question list. They
can't answer their own question. Those questions remain in "My questions"
(`/coaching`), and other staff can still answer them. The new-question Telegram
ping already skips the asker.

## Data & types

Migration:

- `coaching_responses.liked boolean not null default true`. The default covers
  both the backfill and every new answer, and there is one response per request
  (enforced in `respondToRequest`).
- `user_profiles.show_in_leaderboard boolean not null default true`.
- `set_response_liked(response_id uuid, value boolean)` RPC, `SECURITY DEFINER`:
  requires `is_staff(auth.uid())` and `can_see_request`, rejects the caller's own
  question, and updates only `liked`.
- `weekly_leaderboard()` RPC, `SECURITY DEFINER`: needed because a student can't
  read other users' rows. Returns `place, nickname, likes, is_me` for places up
  to 20 plus the caller's own row. Uses SQL `rank()`, and exposes no user ids.
  Execute is granted to `authenticated` only.

Code:

- `lib/leaderboard/` holds the row type and a server read function.
- `setResponseLiked` server action in `lib/coaching/actions.ts`, revalidating
  `/admin`, `/coaching` and `/leaderboard`.
- `respondToRequest` rejects a request whose `user_id` is the caller's.
- `liked` is added to the response select in `/admin`, `/coaching` and
  `lib/coaching/useMyCoachingRequests.ts`. That SWR cache doesn't revalidate on
  focus, so a change on `/think-time` can show late; this is acceptable.
- No SWR hook: the page reads on the server.

Staff filtering goes in the query or list, not in RLS or `canSeeRequest`: staff
must keep reading their own questions on `/coaching`.

- `app/[locale]/admin/page.tsx`: `.neq('user_id', user.id)`.
- `countNotifications`: `newQuestions` skips rows with `user_id === user.id`.
- `lib/telegram/notify.ts` question list: skip the viewer's own.

## UI

- New route `app/[locale]/leaderboard/page.tsx`, Server Component using
  `PageLayout`, dynamic per request.
- Single component `app/components/Leaderboard/index.tsx`, Server Component.
  Layout follows `specs/assets/022-leaderboard-mockup.html` (an approved
  HTML fragment, colors there are illustrative): simple list of rows in
  `bg-card`, like count in
  `text-primary`, own row with `border-primary`. Cups use the lucide `Trophy`
  icon; gold, silver and bronze are raw colors because their meaning doesn't
  depend on theme.
- `CoachingAdminCard`: a like toggle on answered cards, so a small client part.
  Hidden on the staff member's own question (it can't appear in the queue).
- `CoachingThreadCard` and `CoachingModal` (student mode): a like mark on the
  answer, everywhere the student reads it, including `/think-time`.
- `ProfileForm` + `updateExternalUsernames`: the visibility checkbox.
- `SiteNav`: fourth link with an icon; check it fits the mobile tab bar.

## i18n

Both locales, same keys:

- `nav.leaderboard`
- `leaderboard.title`, `leaderboard.subtitle`, `leaderboard.empty`,
  `leaderboard.you`, `leaderboard.likes`
- `coachingAdmin.like`, `coachingAdmin.unlike`
- `coachingPage.liked`
- `profile.showInLeaderboard`
- `metadata` entry for the page title, following the existing pages
- `coaching.errors.ownQuestion`

## Risks

Because the like is on by default, a coach who never removes one makes the
ranking equal to "answered questions". Anti-spam depends on coaches using the
toggle. This is the user's decision.

## Decisions made without the user (check these)

- The like is stored on the answer, not the question.
- Staff here includes the admin, for both the like toggle and hiding own
  questions, though the request named coaches.
- Own row is pinned when it falls outside the top 20, not the top 5.
- Tied places skip numbers (1, 2, 2, 4), not (1, 2, 2, 3).
- The student sees a like mark on their thread. It appears on nearly every
  answer, since it is on by default.
- Nav link for everyone; guests are sent to login.
- The like mark shows in the modal too, and may lag on `/think-time` until the
  next fetch.
- The leaderboard shows nicknames, which are also the sign-in name, to all
  signed-in users; opt-out, on by default.

## Acceptance criteria

- [x] An answer is liked automatically; existing answers are liked after the
      migration.
- [x] Staff can remove and restore a like; students and non-visible staff can't
      (action and RPC).
- [x] The leaderboard counts likes on answers from the last 7 days only, and a
      removed like drops out at once.
- [x] Equal likes share a place, including the cup; numbering skips after a tie.
- [x] The admin and people who hid themselves aren't listed or
      counted in places.
- [x] Own row is highlighted, and pinned below the list when outside the top 20.
- [x] Guests are redirected to login.
- [ ] Staff don't see their own questions in `/admin`, the bell count or the
      Telegram list, and can't answer them; `/coaching` still shows them.
- [x] `messages/en.json` and `messages/ru.json` stay structurally identical.
- [x] `npm run lint`, `npm test`, `npm run build` pass.
- [x] Tests under `tests/` for new lib logic, actions and components.
