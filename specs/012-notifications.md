# Spec: Notification bell + coaching drafts

Status: approved
Branch: feature/notifications

## Problem

Nothing on the site tells anyone that something new is waiting for them.

1. **Student.** When the coach answers, the student only finds out by going to "My questions" and checking. Spec 010 added the "Answered" tab, but there is no way to tell a new answer from an old one.
2. **Coach (admin).** New student questions only show up when the coach opens `/admin` and looks at the "New" tab.

## Goal

- Every signed-in user has a bell in the header, at the top right next to the menu button. It shows a red number: how many coach answers they haven't opened yet.
- An answer counts as **viewed** once the student opened it in full, that is, clicked "Open" on its card so the coaching modal opened. Visiting the page alone doesn't count.
- On "My questions", an answer that hasn't been opened yet carries a "New answer" label on its card.
- Admins see the same bell with **two** numbers: a green one for student questions without a response, and a red one for unopened answers to the admin's own questions. Clicking the bell opens a small list with the two destinations.
- Text being written in the coaching modal (a question or a response) survives an accidental close: it is restored when the modal is reopened.

## Non-goals

- **No email.** The user deferred it ("давай пока без писем"). A future spec can add it.
- No live updates (websocket / Supabase Realtime / polling). Counts are as fresh as the last server render.
- No notification history or list of individual events. The bell holds counts only.
- No "mark all as read".
- No change to who can see or answer what.

## User-facing behavior

### Student

- The bell is always shown to signed-in users. With nothing new it has no number. Signed-out visitors don't see it.
- With N > 0 unopened answers, the bell carries a red pill with N in its top-right corner. Above 9 it shows "9+". _(Claude's call.)_
- Clicking the bell goes straight to `/coaching?tab=answered`, with no dropdown. _(Claude's call, confirmed in playback.)_
- On `/coaching` → "Answered", every card whose answer hasn't been opened shows a red "New answer" pill next to its status. _(Claude's call, confirmed in playback.)_
- Clicking "Open" on such a card opens the modal **and** marks the answer as viewed. The pill disappears from the card and the bell count drops by one, without a manual reload.
- Opening a card that has no answer yet (the "Awaiting reply" tab) marks nothing.
- The same applies on `/think-time` ("Key positions"). Opening the coaching modal on an answered, unseen position marks it viewed too: the student reads the full thread there. The position's "Answered" badge (spec 010) becomes "New answer" while the answer is unseen. _(User decision: yes, it counts. The badge wording is Claude's call.)_

### Admin

- One bell. Two pills: **green** at the top-left corner (student questions with no response, the same number as the `/admin` "New" tab) and **red** at the top-right corner (unopened answers to the admin's own questions, same rule as for students). A pill with 0 is hidden.
- Clicking the bell opens a small dropdown with two rows:
  - "New student questions" + green pill → `/admin` (the "New" tab is the default)
  - "Answers to my questions" + red pill → `/coaching?tab=answered`

  Both rows are always shown, and a row with 0 shows no pill. _(Claude's call.)_
- The green count drops when the admin sends a response. Opening a question doesn't change it.
- Non-admin users never see the dropdown or a green pill.

### Draft saving (both modes)

The user asked for this in the same release: an accidental close of the modal must not lose the text being written.

- While a student writes a new question, or the coach writes a response, the draft is saved in the browser (`localStorage`) as they type. A short debounce of about 500 ms is fine. _(Claude's call.)_
- The draft holds **everything needed to restore the editor**: the Tiptap document JSON **and** the recorder state behind each move chip (the lines of moves). Text alone isn't enough, because chips without their moves are dropped on load (see `MoveEditor` `onUpdate`).
- Reopening the same modal restores the draft into the editor, with chips that still work.
- Draft keys _(Claude's call)_:
  - question: `coaching-draft:ask:<gameUrl>:<moveIndex>`
  - response: `coaching-draft:reply:<requestId>`
- After a successful submit the draft is deleted. A failed submit keeps it.
- Drafts older than 7 days are ignored and deleted on read. A draft that fails to parse or validate is ignored and deleted. _(Claude's call.)_
- Every `localStorage` access is wrapped in try/catch. When storage is unavailable (private mode or full), the editor just works without drafts.
- Drafts are per browser. There is no cross-device sync. Non-goal: no server-side drafts.

### Existing data

- Every answer that already exists when this ships counts as viewed, so no student gets a pile of stale "new" answers on release day. _(Claude's call, confirmed in playback.)_

### Freshness

- Counts are computed on the server on each render of the header. After opening an answer or sending a response, the header must refresh in the same interaction (revalidate the layout, or `router.refresh()` from the client). A plain client-side navigation between pages may show the count from the last render. That's acceptable. _(Claude's call.)_

## Data & types

### Migration `supabase/migrations/<timestamp>_coaching_response_seen.sql`

- `alter table public.coaching_requests add column response_seen_at timestamptz;` (nullable).
- Backfill: `update coaching_requests set response_seen_at = now() where exists (select 1 from coaching_responses where request_id = coaching_requests.id);`
- Students have no UPDATE policy on `coaching_requests`, and requests are deliberately immutable from the client. Add a narrow `security definer` RPC rather than an UPDATE policy:
  `public.mark_coaching_response_seen(p_request_id uuid) returns void`. It sets `response_seen_at = now()` only where `id = p_request_id and user_id = auth.uid() and response_seen_at is null`, and does nothing otherwise. `set search_path = public`, granted to `authenticated` only.
- **Prod:** this migration has to be applied to prod (`npx supabase db push --linked`) **before** the PR merges. See memory `project_prod_migrations`.

### Rules

- An answer is **unseen** when the request has at least one response and `response_seen_at is null`. The app allows one response per request (`alreadyResponded` error), so a single timestamp is enough.
- The **student / red count** is the number of the current user's own requests (`user_id = auth.uid()`) that are unseen.
  The `user_id` filter is required: the RLS policy lets admins read every request, so without it an admin's red count would include everyone's.
- The **admin / green count** is the number of all requests with no response. It must match what `/admin` puts in "New".

### Code

- `lib/coaching/notifications.ts`: pure helpers (`isUnseen(request)`, `formatBadgeCount(n)` → `"9+"` above 9) plus a server function `getNotificationCounts(user)` → `{ unseenAnswers: number; newQuestions: number | null }`, where `newQuestions` is `null` for non-admins.
- Server action `markResponseSeen(requestId)` in the existing coaching actions module (next to the reply/ask actions). It calls the RPC, then revalidates the `[locale]` **layout** (the header lives in `app/[locale]/layout.tsx`) so the header and `/coaching` re-render.
- `respondToRequest` today revalidates only the `/admin` and `/coaching` pages. It must also revalidate the layout, otherwise the green count won't drop after a response.
- Side effect, accepted: the `coaching_requests_set_updated_at` trigger bumps `updated_at` when the RPC runs. Nothing reads `updated_at` today.
- `CoachingThread` type gains `response_seen_at: string | null`. The `/coaching` query selects it.

### Related fix: `/coaching` shows only your own questions

`app/[locale]/coaching/page.tsx` doesn't filter by `user_id`, so through the admin RLS policy an admin currently sees **every** student's question under "My questions". Add `.eq('user_id', user.id)`. This is required for the admin's red count and its destination to agree. Students are unaffected, since RLS already limited them. `lib/coaching/useMyCoachingRequests.ts` (used on `/think-time`) has the same gap and gets the same `user_id` filter. It also selects `response_seen_at`, and after `markResponseSeen` its SWR cache is revalidated (`mutate`) alongside the header refresh. _(Claude's call.)_

## UI

- New component `app/components/NotificationBell/index.tsx`.
  - It's an async Server Component that fetches the counts, and it renders `null` for signed-out users.
  - The admin dropdown uses the existing shadcn `app/components/ui/dropdown-menu.tsx` (same as `LanguageToggle` / `ThemeToggle`), in a small client sibling `AdminBellMenu.tsx`.
  - Mind `known-issues.md`: radix `asChild` triggers hydrate badly. Render the trigger as its own element styled with `buttonVariants`, as MobileNav does.
- `Header`: render `<NotificationBell />` between the logo and `MobileNav`, on the right side, at every breakpoint.
- Icon: `Bell` from `lucide-react` (already used by shadcn).
- Colors:
  - Red pill uses `bg-destructive text-white`.
  - Green pill uses `bg-green-600 text-white`, the raw universal-semantic color allowed by conventions.
  - Both pills get a `ring-2 ring-card` so they stand out from the button.
  - They have to look right in all three themes (light, dark, rose).
- Drafts: `lib/coaching/drafts.ts` holds pure `loadDraft(key)` / `saveDraft(key, draft)` / `clearDraft(key)` with expiry and validation. `CoachingModal` / `MoveEditor` take an optional initial draft and report changes.
- `LongThinks` / `LongThinkCard` (`/think-time`): opening an unseen answered thread calls `markResponseSeen`. The badge shows "New answer" when unseen.
- `CoachingThreadCard`: a "New answer" pill (red, same style) when unseen. The "Open" click calls `markResponseSeen` when the thread has a response and it's unseen. The modal opens immediately and doesn't wait for the action.
- Accessibility: the bell gets `aria-label` with the counts spelled out (e.g. "Notifications: 2 new answers"). Pills are `aria-hidden`.

## i18n

New namespace `notifications` (en / ru):

- `notifications.bell`: "Notifications" / "Уведомления"
- `notifications.bellLabel`: "Notifications: {answers} new answers, {questions} new questions" / "Уведомления: новых ответов — {answers}, новых вопросов — {questions}" (admin)
- `notifications.bellLabelStudent`: "Notifications: {answers} new answers" / "Уведомления: новых ответов — {answers}"
- `notifications.newQuestions`: "New student questions" / "Новые вопросы учеников"
- `notifications.myAnswers`: "Answers to my questions" / "Ответы на мои вопросы"
- `coaching.status.newAnswer`: "New answer" / "Новый ответ"

Use ICU plurals in the aria labels if it reads better. Keep both files structurally identical.

## Acceptance criteria

- [ ] Signed-out: no bell (test)
- [ ] Student with 0 unseen: bell, no pill. With 3 unseen: red pill "3". With 12: "9+" (test)
- [ ] Student bell links to `/coaching?tab=answered` (test)
- [ ] Unseen answered card shows "New answer". Clicking "Open" calls `markResponseSeen` once and opens the modal (test)
- [ ] Opening an already-seen or unanswered card doesn't call `markResponseSeen` (test)
- [ ] `/think-time`: opening an unseen answered position calls `markResponseSeen`, and its badge shows "New answer" until then (test)
- [ ] Draft: typing text plus a move chip, closing the modal and reopening it restores both, and the chip still shows its line (test)
- [ ] Draft: deleted after a successful submit, kept after a failed one. Expired or corrupt drafts are ignored. Storage throwing doesn't break the editor (test)
- [ ] Admin: green pill = requests with no response, red pill = own unseen. The dropdown has both rows with correct links (test)
- [ ] `/coaching` lists only the current user's requests, including for admins (test)
- [ ] Migration: backfill marks existing answered requests seen. The RPC can't mark another user's request (verified on local Supabase)
- [ ] Browser check on local Supabase: answer a question as admin → the student's bell shows 1 → open it → the bell clears
- [ ] Pills readable in light / dark / rose
- [ ] `npm run lint`, `npm test`, `npm run build` pass
- [ ] Prod migration applied before merge
