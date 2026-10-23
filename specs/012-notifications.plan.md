# Notification Bell + Coaching Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A header bell shows a red count of unopened coach answers. Admins also get a green count of unanswered student questions, and a dropdown. Text being written in the coaching modal survives an accidental close.

**Architecture:**
- **Read state.** A nullable `coaching_requests.response_seen_at` stores the read state. It is written only through a `security definer` RPC, wrapped in a server action that revalidates the `[locale]` layout so the header recounts.
- **Counts.** Counts are computed server-side by a pure helper over the same rows the pages already read.
- **Drafts.** Drafts are a pure `localStorage` module (Tiptap doc JSON + recorder state). `CoachingModal` loads it on mount and saves it on change.

**Tech Stack:**
- Next.js 16 App Router (Server Components + server actions)
- Supabase (Postgres, RLS, RPC)
- next-intl
- Tiptap 3
- SWR
- shadcn `dropdown-menu`
- lucide-react `BellIcon`
- Jest + RTL

**Spec:** `specs/012-notifications.md`

## Global Constraints

- **Unseen** = the request has ≥ 1 response **and** `response_seen_at === null`. `undefined` (a field not selected) is never unseen.
- **Red count** = the current user's own requests (`user_id = user.id`) that are unseen.
- **Green count** = every request with no response (admins only, otherwise `null`). It equals the `/admin` "New" tab count.
- **Badge text:** `n` for 1–9, `"9+"` above 9, hidden at 0.
- **Colors:** red pill `bg-destructive text-white`; green pill `bg-green-600 text-white`. Both pills get `ring-2 ring-card`.
- **Draft keys:**
  - question: `coaching-draft:ask:<gameUrl>:<moveIndex>`
  - response: `coaching-draft:reply:<requestId>`
- **Draft lifetime:** debounce 500 ms. Expiry 7 days (`DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000`).
- **Storage safety:** every `localStorage` call is wrapped in try/catch.
- **Copy and layout:** all copy goes through next-intl, and `messages/{en,ru}.json` keep the same key tree (checked by `tests/messages.test.ts`). Follow `.claude/rules/conventions.md`: `cn()`, semantic tokens, `@/` imports, `Link` from `@/i18n/navigation`.
- **Radix triggers:** no `asChild` on Radix triggers (`known-issues.md`). Style the trigger with `buttonVariants`.
- **Migration:** the new migration is `supabase/migrations/20261023130000_coaching_response_seen.sql`.

## Review Focus

1. **`markResponseSeen` fails** (network, or the RPC returns an error). The modal still opens, nothing throws, and the pill simply stays. → Task 6 test.
2. **Opening the same card twice.** The second open doesn't call the action again, because local state already hides the pill. → Task 6 test.
3. **A draft saved for another position** (its `recorder.fen` ≠ the modal's `fen`) is ignored and deleted. A draft whose doc references chip ids missing from `recorder.chips` loads without those chips. → Task 9 test.
4. **An admin's own unanswered question** counts toward green (unanswered). Once answered and unseen it counts toward red. Both numbers come from one set of rows without double-counting other students' answers into red. → Task 3 test.
5. **Exactly 9 vs 10 unseen:** "9" and "9+". → Task 2 test.

---

### Task 1: Migration: `response_seen_at` + RPC

**Files:**
- Create: `supabase/migrations/20261023130000_coaching_response_seen.sql`

**Interfaces:**
- Produces:
  - column `coaching_requests.response_seen_at timestamptz null`
  - RPC `public.mark_coaching_response_seen(p_request_id uuid) returns void`

- [ ] **Step 1: Write the migration.** It does three things:
  - adds the column;
  - backfills `response_seen_at = now()` where a response exists;
  - creates the RPC: `language sql`, `security definer`, `set search_path = public`, body `update coaching_requests set response_seen_at = now() where id = p_request_id and user_id = auth.uid() and response_seen_at is null`. Then `revoke all on function ... from public` and `grant execute ... to authenticated`.

  Follow the comment style of `20261023120000_coaching_content.sql`.
- [ ] **Step 2: Apply it locally.** Run `npx supabase migration up --local`. Expected: `Applying migration 20261023130000_coaching_response_seen.sql...` with no error.
- [ ] **Step 3: Verify the RPC locally** (Studio SQL editor at http://localhost:54323, or `psql` against the local DB URL from `npx supabase status`):
  - `select count(*) from coaching_requests r where exists (select 1 from coaching_responses where request_id = r.id) and response_seen_at is null;` → `0`.
  - Simulate another user with `set local role authenticated; set local request.jwt.claims = '{"sub":"<other-user-uuid>"}';` inside a transaction. Calling `mark_coaching_response_seen` on someone else's request then leaves `response_seen_at` unchanged.
- [ ] **Step 4: Commit.** Message: `feat: track when a student opened the coach's answer`.

### Task 2: Pure notification helpers + type field

**Files:**
- Create: `lib/coaching/notifications.ts`
- Modify: `lib/coaching/types.ts` (add `response_seen_at?: string | null` to `CoachingThreadData`, with a one-line comment)
- Test: `tests/lib/coaching/notifications.test.ts`

**Interfaces:**
- Produces:
  - `isUnseen(thread: { responses: readonly unknown[]; response_seen_at?: string | null }): boolean`
  - `formatBadgeCount(n: number): string | null` (`null` when `n <= 0`)
  - `countNotifications(rows: NotificationRow[], user: { id: string; role: 'user' | 'admin' }): NotificationCounts`
  - `type NotificationRow = { user_id: string; response_seen_at: string | null; coaching_responses: readonly unknown[] }`
  - `type NotificationCounts = { unseenAnswers: number; newQuestions: number | null }`

- [ ] **Step 1: Write failing tests.**
  - `isUnseen`:
    - answered + `null` → true
    - answered + a timestamp → false
    - no responses + `null` → false
    - answered + `undefined` → false
  - `formatBadgeCount`: `0` → `null`, `1` → `'1'`, `9` → `'9'`, `10` → `'9+'`, `12` → `'9+'`.
  - `countNotifications`:
    - user `u1` with rows [own unseen, own seen, own unanswered, other user's unseen] → `{ unseenAnswers: 1, newQuestions: null }`
    - same rows with role `admin` → `{ unseenAnswers: 1, newQuestions: 1 }`
    - admin with an own unanswered row plus another student's unanswered row → `newQuestions: 2`
- [ ] **Step 2: Run.** `npm test -- tests/lib/coaching/notifications.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement** in `lib/coaching/notifications.ts`. `countNotifications` reuses `isUnseen`, and its `newQuestions` counts `coaching_responses.length === 0` over all rows.
- [ ] **Step 4: Run.** Same command → PASS.
- [ ] **Step 5: Commit.** Message: `feat: count unseen answers and new questions`.

### Task 3: Server side: counts loader, `markResponseSeen`, layout revalidation

**Files:**
- Modify: `lib/coaching/actions.ts`
- Create: `lib/coaching/getNotificationCounts.ts` (server-only, not `'use server'`; it's a loader, not an action)
- Test:
  - `tests/lib/coaching/actions.test.ts` (extend)
  - `tests/lib/coaching/getNotificationCounts.test.ts`

**Interfaces:**
- Consumes: `countNotifications`, `NotificationCounts` (Task 2); the RPC (Task 1); `getAuthedUser`.
- Produces:
  - `getNotificationCounts(user: AuthedUser): Promise<NotificationCounts>`. It selects `user_id, response_seen_at, coaching_responses (id)` from `coaching_requests`. It **does not** filter by user, because admins need every row for the green count; `countNotifications` filters for red. For `role: 'user'`, RLS already returns only their own rows. On a query error it returns `{ unseenAnswers: 0, newQuestions: user.role === 'admin' ? 0 : null }`.
  - `markResponseSeen(requestId: string): Promise<void>` in `actions.ts`. It calls `supabase.rpc('mark_coaching_response_seen', { p_request_id: requestId })`, then `revalidatePath('/[locale]', 'layout')`. It never throws: errors are swallowed, because the pill just stays.
  - `respondToRequest` additionally calls `revalidatePath('/[locale]', 'layout')` on success.

- [ ] **Step 1: Write failing tests.**
  - `getNotificationCounts`: mocked rows → expected counts for a user and for an admin. A query error → zeros.
  - `markResponseSeen('r1')`:
    - calls `rpc` with `('mark_coaching_response_seen', { p_request_id: 'r1' })` and `revalidatePath('/[locale]', 'layout')`;
    - when `rpc` resolves `{ error: {...} }` → it resolves without throwing;
    - when `rpc` rejects → it resolves without throwing.
  - `respondToRequest` success → `revalidatePath` was called with `('/[locale]', 'layout')`. Add this assertion to the existing success test.
- [ ] **Step 2: Run.** `npm test -- tests/lib/coaching` → new tests FAIL.
- [ ] **Step 3: Implement** both functions and the extra `revalidatePath`. Update the existing comment above it.
- [ ] **Step 4: Run.** `npm test -- tests/lib/coaching` → PASS.
- [ ] **Step 5: Commit.** Message: `feat: mark answers seen and refresh the header`.

### Task 4: Only your own questions; select `response_seen_at`

**Files:**
- Modify:
  - `app/[locale]/coaching/page.tsx`
  - `lib/coaching/useMyCoachingRequests.ts`
- Test:
  - `tests/app/coaching/page.test.tsx` (extend; the mock builder gains `eq`)
  - `tests/lib/coaching/useMyCoachingRequests.test.ts` (new)

**Interfaces:**
- Produces: `CoachingThread` and `MyCoachingRequest` rows carry `response_seen_at`.

- [ ] **Step 1: Write failing tests.**
  - Coaching page: the query builder records `eq('user_id', 'u1')` (the user from `getAuthedUser`), and `select` includes `response_seen_at`. With an admin user `{ id: 'a1', role: 'admin' }` it filters `eq('user_id', 'a1')`.
  - Hook fetcher: with `auth.getUser()` resolving `{ data: { user: { id: 'u1' } } }`, it calls `eq('user_id', 'u1')`. The mapped request has `response_seen_at`. With no user it returns `{}`.
- [ ] **Step 2: Run** both test files → FAIL.
- [ ] **Step 3: Implement.**
  - Page: `.eq('user_id', user.id)` and map `response_seen_at`.
  - Hook fetcher: `const { data: { user } } = await supabase.auth.getUser()`, then return `{}` without a user, then `.eq('user_id', user.id)`. Add `response_seen_at` to the select and the mapping.
  - Add a comment in both places on why the filter exists: the admin RLS policy reads everyone's rows.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit.** Message: `fix: my questions shows only my own, even for admins`.

### Task 5: i18n keys

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`
- Test: `tests/messages.test.ts` (existing structure check)

Add exactly the keys in spec §i18n:
- `notifications.{bell, bellLabel, bellLabelStudent, newQuestions, myAnswers}`
- `coaching.status.newAnswer`

The en/ru values are verbatim from the spec. Add `notifications` after `coachingPage`.

- [ ] **Step 1: Add the keys.**
- [ ] **Step 2: Run.** `npm test -- tests/messages.test.ts` → PASS.
- [ ] **Step 3: Commit.** Message: `feat: notification copy`.

### Task 6: "New answer" on `/coaching` cards + mark on open

**Files:**
- Modify: `app/components/CoachingThreadCard/index.tsx`
- Test: `tests/app/components/CoachingThreadCard/CoachingThreadCard.test.tsx` (extend; mock `@/lib/coaching/actions`)

**Interfaces:**
- Consumes: `isUnseen` (Task 2), `markResponseSeen` (Task 3), `coaching.status.newAnswer` (Task 5).

- [ ] **Step 1: Write failing tests.**
  - Unseen answered thread → the "coaching.status.newAnswer" text is shown. Clicking "open" calls `markResponseSeen('<id>')` once, the modal renders, and the pill disappears.
  - Clicking "open" again (close, then reopen) → still exactly one call.
  - A seen thread, or one with no responses → no pill, and "open" doesn't call the action.
  - `markResponseSeen` rejecting → the modal still renders, with no unhandled error. Use `mockRejectedValue` and assert the modal mock is in the document.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - Keep a local `const [seen, setSeen] = useState(!isUnseen(thread))`.
  - On "open": `setOpen(true)`. If `!seen`, also `setSeen(true)` and `void markResponseSeen(thread.id).catch(() => {})`.
  - Pill: `rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white`, next to the existing header line.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit.** Message: `feat: new-answer label on my questions`.

### Task 7: `/think-time`: "New answer" badge + mark on open

**Files:**
- Modify:
  - `app/components/LongThinks/index.tsx`
  - `app/components/LongThinks/LongThinkCard.tsx`
- Test: `tests/app/components/LongThinks/LongThinkCard.test.tsx` (extend), `tests/app/components/LongThinks/LongThinks.test.tsx` (new, if there's no container test yet)

**Interfaces:**
- Consumes: `isUnseen`, `markResponseSeen`.
- Produces: the `LongThinkCard` prop `hasNewAnswer: boolean`.

- [ ] **Step 1: Write failing tests.**
  - Card with `threadStatus="answered"` and `hasNewAnswer` → shows `coaching.status.newAnswer` instead of `coaching.status.answered`. Without `hasNewAnswer` → `answered` as today.
  - Container (mocks: `useMyCoachingRequests` returns one unseen answered request at the card's fen, plus `GamesShell` rendering its children with one game, plus `CoachingModal`): clicking the card's coaching button calls `markResponseSeen(id)` and then the hook's `mutate`. For a seen request → no call.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - Enrich each item with `hasNewAnswer: isUnseen(requestsByFen?.[fen] ?? { responses: [] })`.
  - In `onAskCoach`, when the thread is unseen: `void markResponseSeen(id).then(() => refreshRequests(), () => {})`.
  - Badge: same red pill style as Task 6, with `CheckIcon`.
  - `askedFilter` is unchanged: it still uses `threadStatus`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit.** Message: `feat: new-answer badge on key positions`.

### Task 8: `NotificationBell` in the header

**Files:**
- Create:
  - `app/components/NotificationBell/index.tsx` (async Server Component)
  - `app/components/NotificationBell/AdminBellMenu.tsx` (`'use client'`)
- Modify: `app/components/Header/index.tsx`
- Test: `tests/app/components/NotificationBell/NotificationBell.test.tsx`

**Interfaces:**
- Consumes: `getAuthedUser`, `getNotificationCounts` (Task 3), `formatBadgeCount` (Task 2), the `notifications.*` keys (Task 5), and `app/components/ui/dropdown-menu.tsx`.
- Produces: `<NotificationBell />` (no props). `AdminBellMenu` props: `{ unseenAnswers: number; newQuestions: number; label: string }`.

- [ ] **Step 1: Write failing tests.** Render `await NotificationBell()` with `getAuthedUser` and `getNotificationCounts` mocked.
  - Signed out → renders nothing.
  - Student, 0 unseen → a link to `/coaching?tab=answered` with `aria-label` = `notifications.bellLabelStudent(0)` and no pill text.
  - Student, 3 → pill text `3`. Student, 12 → `9+`.
  - Admin `{ unseenAnswers: 1, newQuestions: 3 }` → a button. After clicking it (`userEvent`), the menu items "notifications.newQuestions" (href `/admin`, pill `3`) and "notifications.myAnswers" (href `/coaching?tab=answered`, pill `1`) are shown. The green pill has class `bg-green-600`, the red pill `bg-destructive`.
  - Admin with `newQuestions: 0` → no green pill on the trigger, but both rows are still present.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - Trigger / link: `cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'relative')` with `BellIcon`.
  - Pills: `aria-hidden`, absolutely positioned. Red at `-top-1.5 -right-1.5`, green at `-top-1.5 -left-1.5`.
  - The admin menu uses `DropdownMenu` / `DropdownMenuTrigger` (no `asChild`) / `DropdownMenuContent align="end"` / `DropdownMenuItem`. Each item holds a `Link` from `@/i18n/navigation`.
  - Header: render `<div className="flex items-center gap-2"><NotificationBell /><MobileNav … /></div>` on the right.
- [ ] **Step 4: Run** → PASS. Then run `npm run lint` → zero warnings.
- [ ] **Step 5: Commit.** Message: `feat: notification bell in the header`.

### Task 9: Draft storage module

**Files:**
- Create: `lib/coaching/drafts.ts`
- Test: `tests/lib/coaching/drafts.test.ts`

**Interfaces:**
- Consumes: `RecorderState` from `lib/coaching/moveRecorder.ts`. `JSONContent` from `@tiptap/react`.
- Produces:
  - `type Draft = { savedAt: number; doc: JSONContent; recorder: RecorderState }`
  - `draftKey(target: { kind: 'ask'; gameUrl: string; moveIndex: number } | { kind: 'reply'; requestId: string }): string`
  - `loadDraft(key: string, fen: string, now?: number): Draft | null`
  - `saveDraft(key: string, draft: Omit<Draft, 'savedAt'>, now?: number): void`
  - `clearDraft(key: string): void`
  - `DRAFT_TTL_MS`

- [ ] **Step 1: Write failing tests.**
  - `draftKey`: `ask` → `'coaching-draft:ask:https://x/g/1:14'`; `reply` → `'coaching-draft:reply:r1'`.
  - Save then load round-trips `doc` and `recorder`.
  - `loadDraft` returns `null` **and removes the key** in each of these cases:
    - the value is older than `DRAFT_TTL_MS`;
    - invalid JSON;
    - the wrong shape (`doc.type !== 'doc'`, or `recorder.lines` isn't an object);
    - `recorder.fen !== fen`.
  - A restored recorder has `cursor` reset to `{ line: null, ply: 0 }`, `active: null`, `typed: true`. Lines and chips are kept.
  - Doc chips whose ids are missing from `recorder.chips` are removed from the returned `doc`.
  - `localStorage.getItem` / `setItem` / `removeItem` throwing (via `jest.spyOn(Storage.prototype, ...)`) → `loadDraft` returns `null`, and the save/clear functions don't throw.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Walk `doc.content[].content[]` to drop unknown `moveChip` nodes.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit.** Message: `feat: coaching draft storage`.

### Task 10: Wire drafts into the modal

**Files:**
- Modify:
  - `app/components/CoachingModal/index.tsx`
  - `app/components/CoachingModal/MoveEditor.tsx`
- Test: `tests/app/components/CoachingModal/CoachingModal.drafts.test.tsx` (new; reuse the setup and mocks of the existing CoachingModal tests in that folder)

**Interfaces:**
- Consumes: Task 9's API.
- Produces:
  - `useRecorderStore(fen: string, initial?: RecorderState)`
  - the `MoveEditor` prop `initialDoc?: JSONContent` (used as Tiptap `content`)
  - the `MoveEditor` prop `onDocChange?: (doc: JSONContent) => void`, called from `onUpdate` after the chip sync

- [ ] **Step 1: Write failing tests.**
  - Student asking: type "hello" → advance fake timers 500 ms → `localStorage['coaching-draft:ask:<url>:<idx>']` contains "hello". Unmount and re-render → the editor contains "hello".
  - A saved draft with one chip and a matching recorder line → after render, the chip label is in the editor. Clicking it shows the line on the board (check the board's FEN mock or the active chip highlight, matching the existing chip tests).
  - Submit success (mock the action → `{ success: true }`) → the key is removed. Submit error → the key is kept.
  - Coach mode with `thread.id = 'r1'` → it uses key `coaching-draft:reply:r1`.
  - Read-only mode (`canWrite` false) → it doesn't read or write drafts.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - Draft key: compute it from `mode` / `ask` / `thread`. It's `null` unless `canWrite`.
  - Load: read `loadDraft` once in a lazy `useState` initializer, and pass it to `useRecorderStore` and `MoveEditor`.
  - Save: debounce 500 ms. Each save takes `{ doc, recorder: store.get() }`.
  - Clear: `clearDraft` in the existing `justSubmitted` effect.
- [ ] **Step 4: Run** → PASS. Then run the whole suite: `npm test`.
- [ ] **Step 5: Commit.** Message: `feat: keep coaching drafts across an accidental close`.

### Task 11: Verify and finish

- [ ] **Step 1:** Run `npm run lint`, `npm test`, `npm run build`. All must pass, with zero lint warnings.
- [ ] **Step 2: Browser check on local Supabase** (`npm run dev`, two accounts):
  1. The student asks a question.
  2. The admin's bell shows green 1.
  3. The admin answers it → green clears.
  4. The student's bell shows red 1, and both `/coaching` and `/think-time` show "New answer".
  5. The student opens it on `/think-time` → the bell clears without a reload.
  6. Type a question with a move chip, close the modal, reopen → the text and chip are back.
  7. Check the pills in light, dark and rose themes.
- [ ] **Step 3:** In `specs/012-notifications.md`, set `Status: done` and tick the acceptance criteria. Commit: `docs: mark spec 012 done`.
- [ ] **Step 4:** Remind the user to apply the prod migration (`! npx supabase db push --linked`, then `! npx supabase migration list --linked`) **before** the PR merges. Then use `superpowers:finishing-a-development-branch`.
