# Spec: account menu and Telegram prompt

Status: approved
Branch: feature/account-menu

## Problem

The profile page is hard to find. The only link to it is the user's nickname in grey text inside the hamburger drawer, and that link is hidden below the `lg` breakpoint, so on a phone there is no way to reach the profile at all. Because the Telegram bot (spec 014) can only be connected from the profile, students effectively never learn that it exists.

## Goal

- A signed-in user sees an account button in the header at every screen size and reaches Profile, My questions, Admin (admins only) and Sign out from it in one click.
- A student who has just sent a question is offered the Telegram bot right there and can connect it without leaving the modal.
- A student who ticks "Don't remind me" never sees that offer again, on any device.

## Non-goals

- Avatars or profile photos. The button shows the nickname's first letter.
- Redesigning the profile page itself.
- Other Telegram offers (banners, emails, onboarding). Only the post-question prompt.
- Changing the content-navigation links in the drawer.

## User-facing behavior

### Header, signed in

- To the right of the notification bell: a round button with the first letter of the nickname, uppercased. Accessible label: "Account menu" / "Меню аккаунта".
- Clicking it opens a dropdown:
  1. Nickname (non-clickable label)
  2. Profile / Профиль → `/profile`
  3. My questions / Мои вопросы → `/coaching`
  4. Admin / Админка → `/admin` (admins only)
  5. separator, then Sign out / Выйти
- The drawer no longer contains account links for signed-in users; it keeps content navigation plus language and theme toggles.

### Header, signed out

- A visible "Sign in" / "Войти" link in the header, next to the hamburger.
- The drawer keeps both Sign in and Sign up.

### Telegram prompt after a question

Shown in the coaching modal in student mode, under the "question sent" status, only when all are true:
- the bot is configured (`telegramConfig()` is not null);
- the user has no `telegram_links` row;
- the user has not ticked "Don't remind me".

Contents:
- EN: "Want to know when the coach answers? We'll message you in Telegram." RU: "Хотите узнать, когда тренер ответит? Пришлём сообщение в Telegram."
- Button: the same connect flow as on the profile page (opens the bot in a new tab).
- Checkbox: "Don't remind me" / "Больше не напоминать". Ticking it saves immediately; unticking it before closing the modal undoes it. The prompt stays visible until the modal closes, so the user can still connect.

## Data & types

- Migration: `user_profiles.telegram_prompt_dismissed boolean not null default false`.
- Server action `setTelegramPromptDismissed(dismissed: boolean)` in `lib/telegram/actions.ts`: updates the caller's own row only.
- "Should the prompt show" is computed on the server. How it reaches the modal (prop from the page vs. returned by `createCoachingRequest`) is the builder's call; pick the one that touches fewest callers of `CoachingModal`.

## UI

- New `app/components/AccountMenu/index.tsx` (client): the round trigger plus dropdown, using `app/components/ui/dropdown-menu.tsx`. Render the trigger without `asChild` (see known-issues: radix `asChild` hydration mismatch).
- `AuthMenu` and `Header` change so the account button sits in the header and the drawer loses signed-in account links.
- New `app/components/TelegramPrompt/index.tsx` (client), rendered by `CoachingModal`; reuses the connect logic from `TelegramConnect` rather than duplicating it.

## i18n

- `auth.accountMenu` — trigger label
- `auth.profile` — "Profile" / "Профиль"
- `telegram.prompt.text`
- `telegram.prompt.connect` — "Connect Telegram" / "Подключить Telegram"
- `telegram.prompt.dontRemind`

Reuse existing `auth.myCoaching`, `auth.admin`, `auth.signIn`, `auth.signUp`, `auth.signOut`.

## Acceptance criteria

- [ ] Signed in, at 375px and 1280px wide: the account button is visible in the header and the dropdown links to Profile, My questions and Sign out; Admin appears only for admins
- [ ] Signed out: "Sign in" is visible in the header without opening the drawer
- [ ] After sending a question, an unlinked student without the dismissal sees the Telegram prompt; a linked student does not
- [ ] Ticking "Don't remind me" hides the prompt on the next question, including after a reload and on another browser
- [ ] The prompt never renders when the bot is not configured
- [ ] Prod migration applied (`npx supabase db push --linked`)
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
- [ ] Tests added under `tests/<mirrored path>` for new logic/components
