# Weekly Question Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A weekly `/leaderboard` ranking students by coach likes, a like toggle on answers that is on by default, and staff no longer seeing their own questions in the queue.

**Architecture:** One migration adds `coaching_responses.liked`, `user_profiles.show_in_leaderboard` and two `SECURITY DEFINER` RPCs. Likes are changed through a server action calling `set_response_liked`; the ranking is read server-side through `weekly_leaderboard`, because students can't read other users' rows. Own-question filtering happens in queries and lists, never in RLS or `canSeeRequest`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), next-intl, Tailwind v4 + shadcn, lucide-react, Jest + RTL.

**Spec:** `specs/022-leaderboard.md`

## Global Constraints

- Rolling window: answers with `created_at > now() - interval '7 days'`.
- Ranked: `role = 'user'` and `show_in_leaderboard` only, filtered before ranking.
- Places: SQL `rank()`, so 7, 5, 5, 3 gives 1, 2, 2, 4. List shows `place <= 20`, ties included. Tied rows ordered by nickname.
- One question gives at most one like. No dislike in UI or data.
- No user ids returned from `weekly_leaderboard`.
- Strings only via next-intl; `messages/en.json` and `ru.json` stay structurally identical (`tests/messages.test.ts` enforces).
- Locale-aware `Link`/`redirect` from `@/i18n/navigation`; `cn()`; semantic tokens. Cup colors may be raw.
- `npm run lint` zero warnings, `npm test`, `npm run build` green at the end.

## Review Focus

1. A student or a coach who can't see the question calls `setResponseLiked` → refused, `liked` unchanged (Task 2 test).
2. Tie across the cut: two students on place 2, or several on place 20 → same cup, all shown, own row not pinned twice (Task 4 test).
3. A student unticks the leaderboard box and saves → `false` is stored, because an unticked checkbox sends nothing (Task 5 test).
4. Answer loaded without `liked` (old cache, a select that omits it) → no mark, no crash (Task 3 test).
5. Coach opens `/admin?request=<own question id>` from an old link → page renders normally without that card (Task 1 test).

---

### Task 1: Staff don't see their own questions

**Files:**
- Modify: `app/[locale]/admin/page.tsx`, `lib/coaching/notifications.ts`, `lib/telegram/notify.ts` (question list, around line 175), `lib/coaching/actions.ts` (`respondToRequest`), `messages/{en,ru}.json`
- Test: `tests/lib/coaching/notifications.test.ts`, `tests/lib/coaching/actions.test.ts`, the existing notify test under `tests/lib/telegram/`; add `tests/app/admin-page.test.tsx` only if no test covers the page

**Interfaces:**
- Produces: `coaching.errors.ownQuestion` message. `countNotifications` keeps its signature.

- [ ] Test `countNotifications`: a coach with one own unanswered row and one other row gets `newQuestions: 1`, and own answers still count in `unseenAnswers`. Run, fail.
- [ ] Test the Telegram list: the viewer's own open question isn't listed. Run, fail.
- [ ] Test `respondToRequest`: request with `user_id === user.id` returns `{ error: <ownQuestion> }` and inserts nothing. Run, fail.
- [ ] Implement: `newQuestions` filter adds `r.user_id !== user.id`; Telegram filter adds `r.user_id !== viewer.id`; `respondToRequest` selects `fen, user_id` and rejects before validating the message; admin query adds `.neq('user_id', user.id)`. `canSeeRequest` stays unchanged.
- [ ] Add `coaching.errors.ownQuestion`: en "You can't answer your own question.", ru "Нельзя ответить на свой вопрос."
- [ ] Run `npm test`; expect PASS.
- [ ] Commit `fix: hide staff's own questions from the queue`.

### Task 2: Likes data and action

**Files:**
- Create: `supabase/migrations/20261105120000_leaderboard.sql`
- Modify: `lib/coaching/actions.ts`, `lib/coaching/types.ts`
- Test: `tests/lib/coaching/actions.test.ts`

**Interfaces:**
- Produces, SQL: `coaching_responses.liked boolean not null default true`; `user_profiles.show_in_leaderboard boolean not null default true`; `set_response_liked(response_id uuid, value boolean) returns void`; `weekly_leaderboard() returns table (place int, nickname text, likes int, is_me boolean)`.
- Produces, TS: `setResponseLiked(responseId: string, liked: boolean): Promise<{ error?: string }>`; `CoachingMessage.id?: string`, `CoachingMessage.liked?: boolean`.

- [ ] Write the migration. Execute on both functions is revoked from `public, anon` and granted to `authenticated`; both set `search_path = public`.

`set_response_liked` raises unless `is_staff(auth.uid())`, the request is visible by `can_see_request`, and `request.user_id <> auth.uid()`. `can_see_request` is true for the asker, so the last check is separate. Also recreate policy `"staff answer visible requests as themselves"` with `r.user_id <> auth.uid()`.

`weekly_leaderboard` body (a question with several responses still counts once):

```sql
with scores as (
  select q.user_id, count(distinct a.request_id)::int as likes
  from public.coaching_responses a
  join public.coaching_requests q on q.id = a.request_id
  join public.user_profiles p on p.id = q.user_id
  where a.liked
    and a.created_at > now() - interval '7 days'
    and p.role = 'user'
    and p.show_in_leaderboard
  group by q.user_id
), ranked as (
  select user_id, likes, (rank() over (order by likes desc))::int as place
  from scores
)
select r.place, p.nickname, r.likes, r.user_id = auth.uid()
from ranked r
join public.user_profiles p on p.id = r.user_id
where r.place <= 20 or r.user_id = auth.uid()
order by r.place, p.nickname;
```

- [ ] Test `setResponseLiked`: non-staff returns an error with no RPC call; staff calls `set_response_liked` with `{ response_id, value }`; an RPC error comes back as `{ error }`. Run, fail.
- [ ] Implement it with `getAuthedUser` + `isStaff`, using the `coaching.errors.notAdmin` message; revalidate `/[locale]/admin`, `/[locale]/coaching`, `/[locale]/leaderboard` as `'page'`.
- [ ] Run `npm test -- tests/lib/coaching/actions.test.ts`; expect PASS.
- [ ] If Docker is up: `npx supabase db reset` applies cleanly, and try RPCs as student, as coach, and with a tie. Otherwise note it in the PR.
- [ ] Commit `feat: likes on answers and leaderboard RPCs`.

### Task 3: Like toggle and like mark

**Files:**
- Create: `app/components/ResponseLikeToggle/index.tsx`
- Modify: `app/components/CoachingAdminCard/index.tsx`, `app/components/CoachingThreadCard/index.tsx`, `app/components/CoachingModal/index.tsx`, `app/[locale]/admin/page.tsx`, `app/[locale]/coaching/page.tsx`, `lib/coaching/useMyCoachingRequests.ts`, `messages/{en,ru}.json`
- Test: `tests/app/components/ResponseLikeToggle/index.test.tsx`, `tests/app/components/CoachingThreadCard/`, `tests/app/components/CoachingModal/`

**Interfaces:**
- Consumes: `setResponseLiked`, `CoachingMessage.id`, `CoachingMessage.liked`.
- Produces: `<ResponseLikeToggle responseId={string} liked={boolean} />`, default export, `'use client'`.

- [ ] Test the toggle: renders `aria-pressed` from `liked`; click calls `setResponseLiked(id, !liked)`; on `{ error }` shows the message and keeps the old state. Run, fail.
- [ ] Implement it with `useTransition` and `HeartIcon`, label `t('like')` / `t('unlike')` as `aria-label`.
- [ ] Test the mark: `CoachingThreadCard` with `liked: true` shows `coachingPage.liked`; with `false` and with `liked` absent it shows nothing. Same in `CoachingModal` student mode, and not in staff mode. Run, fail.
- [ ] Implement the mark as a shared render with `liked === true`.
- [ ] Add `id, liked` to the `coaching_responses (...)` select in `/admin`, and `liked` to `/coaching` and `useMyCoachingRequests`.
- [ ] Render the toggle in `CoachingAdminCard` beside `answeredAt` (line 123), only when `r.id` is set, outside the "open" action.
- [ ] Add keys: `coachingAdmin.like` en "Mark as a good question" / ru "Отметить как хороший вопрос"; `coachingAdmin.unlike` en "Remove like" / ru "Снять лайк"; `coachingPage.liked` en "The coach liked this question" / ru "Тренеру понравился вопрос".
- [ ] Run `npm test`; expect PASS.
- [ ] Commit `feat: coach like toggle and like mark for students`.

### Task 4: Leaderboard page

**Files:**
- Create: `lib/leaderboard/types.ts`, `lib/leaderboard/rows.ts`, `lib/leaderboard/getLeaderboard.ts`, `app/components/Leaderboard/index.tsx`, `app/[locale]/leaderboard/page.tsx`
- Modify: `messages/{en,ru}.json`
- Test: `tests/lib/leaderboard/rows.test.ts`, `tests/app/components/Leaderboard/index.test.tsx`

**Interfaces:**
- Consumes: `weekly_leaderboard()`.
- Produces: `type LeaderboardRow = { place: number; nickname: string; likes: number; is_me: boolean }`; `type Cup = 'gold' | 'silver' | 'bronze'`; `cupFor(place: number): Cup | null`; `splitRows(rows: LeaderboardRow[]): { top: LeaderboardRow[]; pinned: LeaderboardRow | null }`; `getLeaderboard(): Promise<LeaderboardRow[]>`.

- [ ] Test `cupFor`: 1, 2, 3 give gold, silver, bronze; 4 gives null. Test `splitRows`: own row at place 21 → `pinned`; own row at place 20 → stays in `top`, `pinned` null; tied places 2, 2 and four rows at place 20 all stay in `top`; no own row → null. Run, fail.
- [ ] Implement `rows.ts`.
- [ ] Test `Leaderboard`: tied places 1, 2, 2, 4 show gold, two silver cups and "4"; own row has `aria-current="true"`; pinned row comes after a `···` separator; empty rows show `leaderboard.empty`. Run, fail.
- [ ] Implement `Leaderboard` to `specs/assets/022-leaderboard-mockup.html`: rows in `bg-card border-border`, own row `border-primary`, count in `text-primary`, nickname `min-w-0 truncate`. Use lucide `TrophyIcon` with `aria-label` of the place.
- [ ] Implement `getLeaderboard` through the server client; on error throw, so `app/[locale]/error.tsx` shows its retry screen.
- [ ] Implement the page: `getAuthedUser`, guests redirect to `/login`, `PageLayout` with `t('title')` and `t('subtitle')`, `generateMetadata` using `leaderboard.metaTitle`, as `app/[locale]/about/page.tsx` does.
- [ ] Add `leaderboard` namespace: `metaTitle` en "Leaderboard" / ru "Лидерборд"; `title` en "Leaderboard of the week" / ru "Лидерборд недели"; `subtitle` en "Coach likes over the last 7 days" / ru "Лайки тренеров за 7 дней"; `empty` en "No likes yet this week. Ask a coach a good question!" / ru "На этой неделе лайков пока нет. Задай тренеру хороший вопрос!"; `you` en "You" / ru "Ты"; `likes` en "{count, plural, one {# like} other {# likes}}" / ru "{count, plural, one {# лайк} few {# лайка} other {# лайков}}"; `place` en "Place {place}" / ru "{place} место".
- [ ] Run `npm test`; expect PASS.
- [ ] Commit `feat: weekly leaderboard page`.

### Task 5: Navigation and profile setting

**Files:**
- Modify: `app/components/SiteNav/index.tsx`, `app/components/ProfileForm/index.tsx`, `app/[locale]/profile/page.tsx`, `lib/auth/profileActions.ts`, `messages/{en,ru}.json`, `specs/022-leaderboard.md`
- Test: `tests/app/components/SiteNav/`, the profile actions test under `tests/lib/auth/`

**Interfaces:**
- Consumes: `user_profiles.show_in_leaderboard`.
- Produces: `ProfileForm` prop `initial.showInLeaderboard: boolean`; form field name `show_in_leaderboard`.

- [ ] Test `SiteNav`: both navs contain a link to `/leaderboard`. Run, fail.
- [ ] Add `{ href: '/leaderboard', key: 'leaderboard', Icon: TrophyIcon }` to `links` and `nav.leaderboard`: en "Leaderboard" / ru "Лидерборд". Update the "Three sections" comment. Check at 360px width that four tabs fit.
- [ ] Test `updateExternalUsernames`: `show_in_leaderboard` absent from the form stores `false`; `'on'` stores `true`. Run, fail.
- [ ] Implement it with `formData.get('show_in_leaderboard') === 'on'`; select the column on the profile page; add a checkbox to `ProfileForm` with `defaultChecked`.
- [ ] Add `profile.showInLeaderboard`: en "Show me on the leaderboard" / ru "Показывать меня в лидерборде".
- [ ] Set `Status: done` in `specs/022-leaderboard.md`, and tick its criteria that passed.
- [ ] Run `npm run lint`, `npm test`, `npm run build`; expect all green.
- [ ] Commit `feat: leaderboard nav link and profile visibility setting`.
