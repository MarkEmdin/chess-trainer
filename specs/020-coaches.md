# Spec: Coaches — role, applications, assigned students

Status: in-progress
Branch: feature/coaches

## Problem

Only one account can answer questions: the one whose `user_profiles.role` is
`admin`. Adding a second coach means editing the database by hand and giving
them full admin rights. Answers don't record who wrote them, so with two
coaches nobody could tell who answered. There is no way for a coach to have
their own students.

## Goal

- A new **coach** role. Coaches answer students' questions from the existing
  questions page (`/admin`).
- Any signed-in user can **apply to become a coach**. The admin (only the
  owner's account) reviews applications and approves or rejects them in the UI.
- The admin manages coaches in the UI: sees the list, revokes the role,
  **assigns students** to a coach.
- **Visibility:** a student with a coach is seen only by that coach and the
  admin. A student without a coach is seen by every coach and the admin. A
  coach's own students' questions are highlighted.
- **Every answer records its author.** Students and staff see who answered,
  e.g. "IM Ivan Petrov".
- **Notifications** (bell + Telegram) go to the admin for every question and to
  each coach for the questions that coach can see.

## Non-goals

- Students choosing their coach, coaches inviting students (later).
- Making another account admin from the UI. Admin stays the owner's account
  only; the UI can only toggle `user` ↔ `coach`.
- Several coaches per student, multiple answers per question.
- Coach-to-coach discussion, coach ratings, payments.
- Editing a coach's public profile after approval (admin can re-approve a new
  application; a coach can't edit theirs yet).

## Roles

| Role | DB value | Who |
|------|----------|-----|
| Admin | `admin` | Owner's account only. Sees and answers everything, manages coaches. |
| Coach | `coach` (new enum value) | Approved applicants. Sees visible questions, answers them, can also ask. |
| Student | `user` (unchanged) | Everyone else. Asks questions. |

"Staff" below = admin or coach.

### Visibility rule (one place: SQL `can_see_request`, mirrored in TS `canSeeRequest`)

A viewer can see a question (request) when any of:
1. they asked it;
2. they are admin;
3. they are coach **and** the asker has no assigned coach **or** the assigned
   coach is them.

Consequences (decided with the user):
- Assignment is current state: assigning a student hides *all* their questions,
  old ones too, from other coaches. Unassigning makes them visible again.
- Answering a question does not assign the student.
- A coach's own questions: coaches can't be assigned, so they are seen by all
  coaches; any coach (even the asker) can answer.
- Revoking a coach role unassigns all their students.

## User-facing behavior

### Apply to become a coach — `/become-coach`

- Entry: "Become a coach" item in the account menu, shown to role `user` only.
- Signed out → redirect to login.
- Already coach/admin → short "You are already a coach" note with a link to
  the questions page.
- **Pending application** → "Your application is under review", submitted
  date, read-only summary. No second submit.
- **Rejected (latest)** → "Your previous application was not approved" + the
  form again (prefilled from the last one). Reapplying is allowed immediately.
- **No application** → form:
  - First name* (≤ 50), Last name* (≤ 50)
  - Title* — select: GM, IM, FM, CM, WGM, WIM, WFM, WCM, MS (Master of Sport),
    CMS (Candidate Master), 1st category, No title
  - FIDE ID (optional, digits only, ≤ 12)
  - Chess.com username, Lichess username — **at least one required**;
    prefilled from the profile's saved handles
  - About* — textarea, ≤ 1000 chars
  - Submit → status view "under review". Admin gets a Telegram message.

### Admin: manage coaches — `/admin/coaches`

Admin only (others redirect to `/`). Linked from the account menu ("Coaches")
and from a link on `/admin`. Tabs in the URL (`?tab=`):

1. **Applications** (default) — pending applications, newest first. Card shows
   nickname, all fields, submitted date; buttons **Approve** / **Reject**.
   Count in the tab label.
   - Approve: role → `coach`, public coach profile (first, last, title) is
     created/overwritten from the application, the user's student assignment
     (if any) is removed, application → `approved`. The applicant gets a
     Telegram message if linked.
   - Reject: application → `rejected`. Telegram message if linked.
2. **Coaches** — every coach: display name, nickname, number of students, list
   of students (nickname, **Unassign**), an **Assign student** field (nickname,
   exact case-insensitive match; must be a role-`user` account; reassigning a
   student who has another coach moves them), and **Revoke coach role**
   (role → `user`, unassigns their students; the public profile stays so old
   answers keep their author's name).
3. **My coach profile** — the admin's own first / last / title, so their
   answers are signed too. Same fields and limits as the application.

All errors render inline next to the control; success re-renders the page
(server actions + `revalidatePath`).

### Questions page — `/admin` (now staff)

- Open to admin and coach. Title "Student questions" stays.
- Lists the questions the viewer can see (RLS does the filtering).
- Tabs unchanged: New / Answered. The viewer's own questions stay in the
  list (spec 012 behaviour; a coach may answer their own question).
- A coach's own students' cards get a **"My student"** badge and sort first
  within each tab. Admin sees a "Coach: <display name>" note on assigned
  students' cards instead.
- Answered cards show "Answered by <display name>" instead of "Your response";
  "Your response" when the author is me.
- The reply form is the same; the action now accepts coaches.

### Student side

- Thread card and modal: answer label becomes "Answer from <display name>"
  (fallback "Coach's answer" when the author has no coach profile).

### Notifications

- **Bell:** staff get the green "new questions" count = unanswered visible
  questions (own included, as in spec 012). Menu item label "Student questions" → `/admin`.
  Admin's menu also gets "Coach applications" with the pending count (only
  when > 0, and the green pill counts it too).
- **Telegram on a new question:** admin(s) always; if the asker has a coach,
  that coach; otherwise every coach. Never the asker.
- **Telegram `/new`:** available to staff; lists only questions that viewer can
  see.
- **Telegram on a new application:** admin(s). On approve/reject: the
  applicant.
- Telegram "connected" message: staff get the coach variant.

## Data & types

### Migrations

Two files, because a new enum value can't be used in the same transaction
that adds it:

1. `…_coach_role.sql` — `alter type public.user_role add value 'coach';`
2. `…_coaches.sql`:
   - `is_staff(user_id)` security definer stable: role in (`admin`,`coach`).
   - `coach_profiles` — `user_id uuid pk → auth.users on delete cascade`,
     `first_name`, `last_name`, `title` text not null, timestamps. RLS: select
     for `authenticated`; no client writes (service role only).
   - `coach_applications` — `id`, `user_id → auth.users cascade`,
     `first_name`, `last_name`, `title`, `fide_id`, `chesscom_username`,
     `lichess_username`, `about`, `status` text check in
     (`pending`,`approved`,`rejected`) default `pending`, `created_at`,
     `reviewed_at`. Partial unique index: one `pending` per user. Length
     checks mirror the form. RLS: insert own with status `pending`; select own;
     select all for admin. No client update/delete.
   - `coach_students` — `student_id uuid pk → auth.users cascade`,
     `coach_id uuid not null → auth.users cascade`, `created_at`. Index on
     `coach_id`. RLS: select where `coach_id = auth.uid()` or
     `student_id = auth.uid()` or admin. Writes service role only.
   - `can_see_request(viewer uuid, asker uuid)` security definer stable —
     the rule above.
   - `coaching_responses.author_id uuid → auth.users on delete set null`,
     backfilled to the admin account (`select id from user_profiles where
     role = 'admin' order by created_at limit 1`).
   - Policies: replace "admins read all coaching requests" with "staff read
     visible coaching requests" using `can_see_request(auth.uid(), user_id)`;
     same for responses (via the parent request); replace "admins create
     coaching responses" with insert check `author_id = auth.uid() and
     is_staff(auth.uid()) and` the request is visible. Staff read profiles
     (nickname) of askers they can see: replace "admins read all profiles"
     with admin-all + coach-reads-visible-askers (`can_see_request(auth.uid(),
     id)`).
   - `revoke all … from anon` on the new tables, like earlier migrations.

### TypeScript

- `lib/auth/roles.ts`: `export type Role = 'user' | 'coach' | 'admin'`,
  `isStaff(role)`. `AuthedUser.role: Role`.
- `lib/coaches/`:
  - `titles.ts` — `COACH_TITLES` (ids above) + `isCoachTitle`.
  - `displayName.ts` — `coachDisplayName({ first_name, last_name, title })`
    → "IM Ivan Petrov" (title omitted for `none`; translated title labels for
    MS/CMS/1st category come from i18n, so the function takes a title-label
    lookup).
  - `visibility.ts` — `canSeeRequest(viewer, askerId, assignments)` mirror for
    Telegram filtering (service-role reads bypass RLS).
  - `application.ts` — `parseApplication(formData)` → validated fields or a
    field-error map.
  - `actions.ts` (`'use server'`) — `applyForCoach`, `approveApplication`,
    `rejectApplication`, `assignStudent`, `unassignStudent`, `revokeCoach`,
    `saveMyCoachProfile`. Admin actions check `getAuthedUser().role === 'admin'`
    then write with the service-role client.
- `lib/coaching/actions.ts` `respondToRequest`: allow staff, insert
  `author_id: user.id`.
- `CoachingMessage` gains optional `author_name?: string | null`; queries load
  `author_id` and resolve names from `coach_profiles` in a second query.
- `countNotifications` takes `Role` and excludes the viewer's own questions
  from `newQuestions`; adds `pendingApplications` for admin.
- No new SWR hook: student threads keep `useMyCoachingRequests` (author names
  are added in its fetcher).

## UI

- New route `app/[locale]/become-coach/page.tsx` (server) +
  `app/components/CoachApplicationForm/index.tsx` (client, `useActionState`).
- New route `app/[locale]/admin/coaches/page.tsx` (server) + feature folder
  `app/components/CoachManagement/` (`ApplicationCard.tsx`, `CoachCard.tsx`,
  `MyCoachProfileForm.tsx`, `index.tsx` exporting them) — client pieces for
  forms/buttons.
- `CoachingAdminCard`: "My student" badge, assigned-coach note, author line.
- `AccountMenu`: props become `role`; items: Become a coach (user), Questions
  (staff), Coaches (admin).
- `NotificationBell` / `AdminBellMenu`: staff variant + applications item.
- Reuse shadcn `Card`, `Button`, `Input`, `Textarea`/`select` already used in
  `ProfileForm`/`FormField`.

## i18n

New namespace `coaches` in both locales:
- `coaches.titles.{GM,IM,FM,CM,WGM,WIM,WFM,WCM,MS,CMS,cat1,none}`
- `coaches.apply.*` — page title/subtitle, field labels, submit, pending,
  rejected, alreadyCoach, errors (required, tooLong, needAccount, badFide,
  alreadyPending)
- `coaches.manage.*` — page title, tabs, approve/reject, empty states,
  assign/unassign/revoke, students count, errors (notFound, notStudent,
  notAdmin), myProfile
- `coaches.answeredBy`, `coaches.myStudent`, `coaches.assignedTo`
- `auth.becomeCoach`, `auth.coaches`, rename value of `auth.admin` to
  "Questions" / "Вопросы учеников"
- `notifications.applications`
- `telegram.messages.*` for application submitted / approved / rejected

## Decisions made without the user (check these)

- Coach public profile = first + last name + title only; FIDE ID, accounts and
  "about" stay in the application, visible to admin.
- Reapplying after rejection is allowed immediately.
- Assign by nickname (exact match), not by a search dropdown.
- `/admin` URL kept for the questions page so existing Telegram links work.
- Old answers are attributed to the admin account by the migration.
- The admin's own answers show their coach profile name if filled, else
  "Coach".

## Acceptance criteria

- [ ] User applies; admin sees it, approves; the user's menu shows Questions
      and `/admin` opens for them.
- [ ] Reject shows the rejected state and allows reapplying.
- [ ] Coach sees unassigned students' questions and answers them; the student
      sees "Answer from <name>".
- [ ] Admin assigns student S to coach A: coach B no longer sees S's questions
      (UI and direct API), A sees them with "My student" first.
- [ ] Revoke: role back to `user`, students unassigned.
- [ ] Telegram/bell recipients follow the visibility rule.
- [ ] Non-admin can't call admin actions; non-staff can't respond (action and
      RLS).
- [ ] `npm run lint`, `npm test`, `npm run build` pass.
- [ ] Tests under `tests/` for new lib logic, actions and components.
