# Coaches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coach role, coach applications reviewed by the admin, admin-assigned students with visibility rules, answer authorship, staff notifications.

**Architecture:** Visibility lives in SQL (`can_see_request` used by RLS) with a TS mirror for service-role code (Telegram). Admin writes go through server actions that check the admin role and use the service-role client. Pages are server components reading through RLS; forms are small client components with `useActionState`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), next-intl, Tailwind v4 + shadcn, Jest + RTL.

**Spec:** `specs/020-coaches.md`

## Global Constraints

- Roles: `'user' | 'coach' | 'admin'`; UI can only set `user` ↔ `coach`.
- Title ids: `GM IM FM CM WGM WIM WFM WCM MS CMS cat1 none`.
- Limits: first/last name ≤ 50, FIDE ID digits ≤ 12, about ≤ 1000, at least one of Chess.com / Lichess.
- Strings only via next-intl; `messages/en.json` and `ru.json` stay structurally identical (`tests/messages.test.ts` enforces).
- Locale-aware `Link`/`redirect` from `@/i18n/navigation`; `cn()`; semantic tokens.
- `npm run lint` zero warnings, `npm test`, `npm run build` green at the end.

## Review Focus

1. Coach B calls `respondToRequest` for a request of coach A's student → refused by action (visibility check) and by RLS (Task 3 test for the action).
2. Assigning a nickname that is a coach/admin or doesn't exist → inline error, no row (Task 6 test).
3. Approving an applicant who is currently someone's student → assignment removed (Task 6 test).
4. A coach's bell counts only questions RLS lets them see; pending applications count for the admin only (Task 4 test).
5. Telegram new-question fan-out when asker has a coach → only admin + that coach (Task 5 test).

---

### Task 1: Migrations + Role type

**Files:**
- Create: `supabase/migrations/20261103120000_coach_role.sql`, `supabase/migrations/20261103120100_coaches.sql`
- Create: `lib/auth/roles.ts`
- Modify: `lib/auth/getUser.ts` (role: `Role`)
- Test: `tests/lib/auth/roles.test.ts`

**Interfaces:**
- Produces: `type Role = 'user' | 'coach' | 'admin'`; `isStaff(role: Role): boolean`; `isRole(v: unknown): v is Role`. Tables `coach_profiles`, `coach_applications`, `coach_students`; column `coaching_responses.author_id`; SQL `is_staff(uuid)`, `can_see_request(viewer uuid, asker uuid)`.

- [ ] Test `isStaff` (user false, coach/admin true) and `isRole`; run, fail; implement; pass.
- [ ] Write the two migrations exactly as the spec's Data section. Policies to drop by name: `"admins read all coaching requests"`, `"admins read all coaching responses"`, `"admins create coaching responses"`, `"admins read all profiles"`.
- [ ] `getUser.ts`: `role: isRole(profile?.role) ? profile.role : 'user'`.
- [ ] If Docker is up: `npx supabase db reset` applies cleanly. Otherwise note it in the PR.
- [ ] Commit `feat: coach role, coach tables and visibility policies`.

### Task 2: Pure coach helpers

**Files:**
- Create: `lib/coaches/titles.ts`, `lib/coaches/displayName.ts`, `lib/coaches/visibility.ts`, `lib/coaches/application.ts`
- Test: `tests/lib/coaches/{titles,displayName,visibility,application}.test.ts`

**Interfaces:**
- `COACH_TITLES: readonly CoachTitle[]`, `isCoachTitle(v: unknown): v is CoachTitle`
- `type CoachProfile = { first_name: string; last_name: string; title: CoachTitle }`
- `coachDisplayName(p: CoachProfile, titleLabel: (t: CoachTitle) => string): string` — `none` → "Ivan Petrov"; FIDE titles render their id ("IM Ivan Petrov"); MS/CMS/cat1 use `titleLabel`.
- `canSeeRequest(viewer: { id: string; role: Role }, askerId: string, coachOf: ReadonlyMap<string, string>): boolean`
- `type ApplicationFields = { first_name; last_name; title: CoachTitle; fide_id: string | null; chesscom_username: string | null; lichess_username: string | null; about: string }`
- `parseApplication(fd: FormData): { ok: true; fields: ApplicationFields } | { ok: false; errors: Partial<Record<keyof ApplicationFields | 'accounts', ApplicationError>> }` with `ApplicationError = 'required' | 'tooLong' | 'invalid' | 'needAccount'`. Trims; empty optional → null.

- [ ] Tests: display name for `IM`, `none`, `CMS` (via label fn); visibility for own / admin / coach + unassigned / coach + own student / coach + other's student / plain user; parse: valid, missing first name, 51-char last name, fide `12a` → invalid, no accounts → `accounts: needAccount`, bad title → invalid, 1001-char about → tooLong.
- [ ] Implement; tests pass; commit `feat: coach title, display name, visibility and application helpers`.

### Task 3: Answer authorship

**Files:**
- Create: `lib/coaches/authorNames.ts`
- Modify: `lib/coaching/actions.ts` (`respondToRequest`), `lib/coaching/types.ts` (`CoachingMessage.author_id?: string | null; author?: CoachProfile | null`), `lib/coaching/useMyCoachingRequests.ts`
- Test: `tests/lib/coaching/actions.test.ts`, `tests/lib/coaches/authorNames.test.ts`, `tests/lib/coaching/useMyCoachingRequests.test.tsx`

**Interfaces:**
- `withAuthors<T extends { responses: CoachingMessage[] }>(client: SupabaseClient, threads: T[]): Promise<T[]>` — one `coach_profiles` select by distinct `author_id`s, fills `author` (null when no profile). Components format with `coachDisplayName` + `useTranslations('coaches.titles')`.

- [ ] Tests: coach can respond (insert has `author_id: 'u1'`); plain user gets `notAdmin` (key text "Only coaches can reply." / "Отвечать могут только тренеры."); a request row not returned (RLS hides it) → `missingFields` unchanged path.
- [ ] Respond: allow `isStaff(user.role)`, insert `author_id: user.id`. The `coaching_requests` read already goes through RLS, so invisible → no row → error.
- [ ] Student fetcher selects `author_id` in `coaching_responses` and runs `withAuthors`.
- [ ] Commit `feat: record and load the author of each answer`.

### Task 4: Notification counts + bell

**Files:**
- Modify: `lib/coaching/notifications.ts`, `lib/coaching/getNotificationCounts.ts`, `app/components/NotificationBell/index.tsx`, `app/components/NotificationBell/AdminBellMenu.tsx` (rename export kept, file stays)
- Test: matching files under `tests/lib/coaching/`, `tests/app/components/NotificationBell/`

**Interfaces:**
- `countNotifications(rows, user: { id; role: Role }): { unseenAnswers; newQuestions: number | null }` — `newQuestions` for staff = unanswered rows with `user_id !== user.id`.
- `NotificationCounts.pendingApplications: number | null` (admin only, read via `coach_applications` `status=pending` count).
- `AdminBellMenu` props add `pendingApplications: number | null`; renders "Coach applications" item → `/admin/coaches` when > 0; green pill = newQuestions + pendingApplications.

- [ ] Tests: coach gets newQuestions excluding own; user gets null; admin bell shows applications item only when > 0.
- [ ] Implement; commit `feat: bell counts for coaches and coach applications`.

### Task 5: Telegram

**Files:**
- Modify: `lib/telegram/notify.ts` (`notifyAdminsOfQuestion` → `notifyStaffOfQuestion`; `unansweredList(origin, locale, now, viewer)`), `lib/telegram/link.ts` (`isAdmin` → `isStaff`), `app/api/telegram/route.ts`, `lib/telegram/messages.ts`, `lib/coaching/actions.ts` (call site)
- Add: `notifyAdminsOfApplication(applicationId, origin)`, `notifyApplicantOfDecision(userId, approved, origin)` in `notify.ts`
- Test: `tests/lib/telegram/notify.test.ts`, `link.test.ts`, `messages.test.ts`, `tests/app/api/...`

- [ ] Tests: asker with coach → recipients admin + that coach; asker without → admin + all coaches; asker never notified; `/new` for coach filters by `canSeeRequest`; application messages in both locales.
- [ ] Implement with `coach_students` read to build `coachOf` map; commit `feat: telegram notifications follow coach visibility`.

### Task 6: Coach server actions

**Files:**
- Create: `lib/coaches/actions.ts`
- Test: `tests/lib/coaches/actions.test.ts`

**Interfaces:**
- `type ActionState = { error: string } | { success: true } | undefined`
- `applyForCoach(prev, fd)`, `approveApplication(prev, fd /* application_id */)`, `rejectApplication(prev, fd)`, `assignStudent(prev, fd /* coach_id, nickname */)`, `unassignStudent(prev, fd /* student_id */)`, `revokeCoach(prev, fd /* coach_id */)`, `saveMyCoachProfile(prev, fd)` — all `Promise<ActionState>`. `applyForCoach` returns `{ errors: Partial<Record<string,string>> }` on field errors (state type `ApplyState`).
- Admin actions: `getAuthedUser()?.role === 'admin'` else `t('errors.notAdmin')`; writes via `createAdminClient()`; `revalidatePath('/[locale]/admin/coaches','page')` and `('/[locale]','layout')`.

- [ ] Tests: apply as user inserts pending row; apply when pending exists (23505) → alreadyPending; apply as coach → alreadyCoach; non-admin approve → notAdmin; approve sets role coach, upserts profile, deletes `coach_students` where student_id, sets status; assign unknown nickname → notFound; assign coach nickname → notStudent; assign upserts on student_id; revoke sets role user + deletes by coach_id.
- [ ] Implement; commit `feat: coach application and management actions`.

### Task 7: `/become-coach`

**Files:**
- Create: `app/[locale]/become-coach/page.tsx`, `app/components/CoachApplicationForm/index.tsx`
- Modify: `app/components/AccountMenu/index.tsx` (prop `role: Role`), `app/components/Header/index.tsx`, `app/[locale]/profile/page.tsx`, `messages/*.json`
- Test: `tests/app/components/CoachApplicationForm/`, `tests/app/components/AccountMenu/`

- [ ] Tests: form shows field errors from state; prefilled handles; AccountMenu shows Become a coach for user, Questions for coach, Questions + Coaches for admin.
- [ ] Page: signed out → `/login`; staff → alreadyCoach; latest application pending → pending view; rejected → note + form prefilled.
- [ ] Commit `feat: become-a-coach application page`.

### Task 8: `/admin/coaches`

**Files:**
- Create: `app/[locale]/admin/coaches/page.tsx`, `app/components/CoachManagement/{index.tsx,ApplicationCard.tsx,CoachCard.tsx,MyCoachProfileForm.tsx}`
- Test: `tests/app/components/CoachManagement/`

- [ ] Tests: ApplicationCard renders all fields and two buttons; CoachCard lists students with Unassign and shows assign error; MyCoachProfileForm prefilled.
- [ ] Page reads (RLS, admin): pending applications + nicknames, coaches (`role=coach`) + profiles + `coach_students`, own profile. Tabs `applications|coaches|profile` via `?tab=`.
- [ ] Commit `feat: admin page to review applications and manage coaches`.

### Task 9: Questions page for staff

**Files:**
- Modify: `app/[locale]/admin/page.tsx`, `app/components/CoachingAdminCard/index.tsx`, `app/components/CoachingModal/index.tsx`, `app/components/CoachingThreadCard/index.tsx`
- Test: `tests/app/admin/page.test.tsx`, `tests/app/components/CoachingAdminCard/`, `CoachingThreadCard`

- [ ] Tests: coach can open page (no redirect); own questions excluded from tabs; "My student" badge + sorted first; answered card shows "Answered by IM Ivan Petrov" / "Your response" for self; student card shows "Answer from …" and fallback "Coach's answer".
- [ ] Page: allow staff; load `coach_students` (RLS gives coach own rows, admin all) and `withAuthorNames`; admin sees "Coach: name".
- [ ] Commit `feat: coaches answer questions with highlighted own students`.

### Task 10: Verify and finish

- [ ] `npm run lint`, `npm test`, `npm run build` all green.
- [ ] Spec `Status: done`; commit; `superpowers:finishing-a-development-branch` (push + PR, migrations note for the user).
