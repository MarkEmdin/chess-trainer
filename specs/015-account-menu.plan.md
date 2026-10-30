# Account menu and Telegram prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A visible account button in the header, and a dismissible Telegram offer right after a student sends a question.

**Architecture:** `Header` becomes async, reads the user once, and renders a client `AccountMenu` dropdown (or a Sign in link) next to the bell; the drawer gets only guest links. `createCoachingRequest` additionally returns `telegramPrompt: boolean`, computed by a new server helper, and `CoachingModal` renders a `TelegramPrompt` from it. The dismissal lives in a new `user_profiles` column.

**Tech Stack:** Next.js 16 App Router, next-intl, Supabase (RLS), radix dropdown via `app/components/ui/dropdown-menu.tsx`, Jest + RTL.

**Spec:** `specs/015-account-menu.md`

## Global Constraints

- Strings go through next-intl; `messages/en.json` and `messages/ru.json` stay structurally identical (`tests/messages.test.ts`).
- Trigger buttons render without `asChild` (`.claude/rules/known-issues.md`, radix Slot + SSR).
- Semantic Tailwind tokens only; `cn()` for conditional classes.
- Locale-aware `Link` from `@/i18n/navigation`.
- The prompt never renders when `telegramConfig()` is null.

## Review Focus

- `shouldOfferTelegram` failing (DB error, missing profile row): question submit must still succeed, prompt hidden. Test in Task 1.
- Nickname empty string: trigger must still render a visible label (fallback `?`). Test in Task 3.
- Admin replying in the modal (admin mode): prompt must never show. Test in Task 2.
- Unticking the box: must save `false`, not leave it dismissed. Test in Task 2.
- Signed-in drawer: must not show Sign in / Sign up. Test in Task 3.

---

### Task 1: Dismissal column, prompt decision, action wiring

**Files:**
- Create: `supabase/migrations/20261031120000_telegram_prompt_dismissed.sql`
- Create: `lib/telegram/prompt.ts`
- Modify: `lib/telegram/actions.ts`, `lib/coaching/actions.ts:23-26, 151-153`
- Test: `tests/lib/telegram/prompt.test.ts`, `tests/lib/telegram/actions.test.ts`, `tests/lib/coaching/actions.test.ts`

**Interfaces:**
- Produces: `shouldOfferTelegram(userId: string): Promise<boolean>` (server-only, never throws); `setTelegramPromptDismissed(dismissed: boolean): Promise<void>` (server action); `CoachingRequestState` success branch becomes `{ success: true; requestId: string; telegramPrompt: boolean }`.

- [ ] **Step 1: Migration.** `alter table public.user_profiles add column telegram_prompt_dismissed boolean not null default false;` with a one-line comment. The existing "users update own profile" policy already covers it.
- [ ] **Step 2: Failing tests for `shouldOfferTelegram`** (mock `@/lib/supabase/server` and `./config`):
  - `false` when `telegramConfig()` is null, and no DB call is made
  - `true` when profile `telegram_prompt_dismissed` is false and no `telegram_links` row
  - `false` when a `telegram_links` row exists
  - `false` when dismissed
  - `false` when either query returns an error
- [ ] **Step 3: Implement** in `lib/telegram/prompt.ts` with the request-scoped `createClient()` (RLS own-row reads on both tables), the two queries in `Promise.all`, wrapped in try/catch → `false`.
- [ ] **Step 4: Failing tests for `setTelegramPromptDismissed`:** updates `user_profiles` set `{ telegram_prompt_dismissed: <arg> }` `.eq('id', user.id)` for `true` and for `false`; no DB call when signed out.
- [ ] **Step 5: Implement** in `lib/telegram/actions.ts`.
- [ ] **Step 6: Failing test in `tests/lib/coaching/actions.test.ts`:** successful `createCoachingRequest` returns `telegramPrompt` equal to the mocked `shouldOfferTelegram` result (mock `@/lib/telegram/prompt`), called with the user's id. Update existing success assertions to include the field.
- [ ] **Step 7: Implement:** call `shouldOfferTelegram(user.id)` after the insert succeeds; extend the type.
- [ ] **Step 8:** `npm test -- tests/lib` passes. Commit `feat: telegram prompt decision and dismissal`.

### Task 2: Connect hook and TelegramPrompt in the modal

**Files:**
- Create: `lib/telegram/useTelegramConnect.ts`, `app/components/TelegramPrompt/index.tsx`
- Modify: `app/components/TelegramConnect/index.tsx`, `app/components/CoachingModal/index.tsx:352-356`, `messages/{en,ru}.json`
- Test: `tests/app/components/TelegramPrompt/index.test.tsx`, `tests/app/components/CoachingModal/*` (existing file)

**Interfaces:**
- Consumes: `setTelegramPromptDismissed`, `startTelegramLink`, `askState.telegramPrompt` from Task 1.
- Produces: `useTelegramConnect(): { connect: () => void; pending: boolean; started: boolean; error: string | null }` — the exact logic now in `TelegramConnect.connect` (sync `window.open`, `opener = null`, close tab on error, `errors.connectFailed` on throw). `TelegramConnect` switches to it with no behavior change; its existing tests must stay green untouched.

- [ ] **Step 1: i18n keys** under `telegram.prompt`:
  - `text`: EN "Want to know when the coach answers? We'll message you in Telegram." / RU "Хотите узнать, когда тренер ответит? Пришлём сообщение в Telegram."
  - `connect`: "Connect Telegram" / "Подключить Telegram"
  - `dontRemind`: "Don't remind me" / "Больше не напоминать"
- [ ] **Step 2: Extract the hook**; run `npm test -- TelegramConnect` → still PASS.
- [ ] **Step 3: Failing tests for `<TelegramPrompt />`** (mock `@/lib/telegram/actions`):
  - renders the text, a "Connect Telegram" button, and an unchecked "Don't remind me" checkbox
  - clicking the button calls `startTelegramLink`
  - ticking calls `setTelegramPromptDismissed(true)`; unticking then calls `setTelegramPromptDismissed(false)`
  - the prompt stays rendered after ticking
- [ ] **Step 4: Implement** with a native `<input type="checkbox">` + `<label>`, inside a bordered `bg-muted/50` block.
- [ ] **Step 5: Failing modal tests:** student mode, mocked `createCoachingRequest` resolving `{ success: true, requestId: 'r', telegramPrompt: true }` → prompt text visible under the sent status; `telegramPrompt: false` → absent; admin mode after a successful reply → absent.
- [ ] **Step 6: Render** `{mode === 'student' && askState && 'success' in askState && askState.telegramPrompt && <TelegramPrompt />}` after the status `<p>`.
- [ ] **Step 7:** `npm test` passes. Commit `feat: offer telegram after a question`.

### Task 3: Account menu in the header

**Files:**
- Create: `app/components/AccountMenu/index.tsx`
- Modify: `app/components/Header/index.tsx`, `messages/{en,ru}.json`
- Delete: `app/components/AuthMenu/index.tsx` (its guest links move into Header; signed-in part replaced by AccountMenu)
- Test: `tests/app/components/AccountMenu/index.test.tsx`, `tests/app/components/Header/index.test.tsx`

**Interfaces:**
- Produces: `AccountMenu({ nickname: string; isAdmin: boolean })` (client).

- [ ] **Step 1: i18n keys:** `auth.accountMenu`: "Account menu" / "Меню аккаунта"; `auth.profile`: "Profile" / "Профиль".
- [ ] **Step 2: Failing tests for `<AccountMenu />`** (mock `@/i18n/navigation` like `tests/app/components/MobileNav`, mock `@/lib/auth/actions`):
  - trigger button named "Account menu" shows `A` for nickname `ann`; shows `?` for `''`
  - after opening: nickname label, links `/profile`, `/coaching`, Logout item
  - `/admin` link only when `isAdmin`
  - selecting Logout calls `signOut`
- [ ] **Step 3: Implement.** Trigger: `DropdownMenuTrigger` without `asChild`, styled `cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full bg-primary text-primary-foreground hover:bg-primary/90')`. Content `align="end"`. Link items via `DropdownMenuItem asChild` + `Link` (content is portalled and client-only, so the SSR issue does not apply). Logout via `onSelect={() => startTransition(() => signOut())}`.
- [ ] **Step 4: Failing Header tests** (render `await Header()`; mock `@/lib/auth/getUser`, `NotificationBell`, `@/i18n/navigation`):
  - signed in: "Account menu" button present; no "Login" link in the header
  - signed out: "Login" link (`/login`) visible without opening the drawer
  - signed in, drawer opened: no Login / Register links
  - signed out, drawer opened: Login and Register links
- [ ] **Step 5: Implement.** `Header` is `async`, calls `getAuthedUser()` once. Right cluster: `NotificationBell`, then `AccountMenu` or a Login link, then `MobileNav` with `authMenu={user ? null : <guest links>}`. Remove the `{authMenu}` wrapper border in `MobileNav` when `authMenu` is null.
- [ ] **Step 6:** `npm test`, `npm run lint`, `npm run build` pass. Commit `feat: account menu in the header`.

### Task 4: Manual check and docs

- [ ] Local: `npx supabase migration up`, `npm run dev`; at 375px and 1280px check the account menu, guest Login link, and the prompt (ask a question as a student without Telegram; tick, reload, ask another → no prompt).
- [ ] Tick the spec's acceptance criteria that passed; commit `docs: spec 015 manual check`.
