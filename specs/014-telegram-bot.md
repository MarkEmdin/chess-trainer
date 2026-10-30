# Spec: Telegram bot notifications

Status: approved
Branch: feature/telegram-bot

## Problem

Spec 012 added the header bell, but it only helps someone who is already on the site. The coach finds out about a new student question only by opening `/admin`, and a student finds out about an answer only by coming back. Before the public launch (LinkedIn / Reddit posts), a question that waits for days kills the first impression.

## Goal

- Any signed-in user can connect their account to a Telegram bot from `/profile`, and disconnect it again.
- **Admin:** every new student question arrives in Telegram right away, with a button that opens exactly that question on the site, ready to answer. The bot can also send the list of all unanswered questions on demand.
- **Student:** when the coach answers, Telegram says so, with a button that opens the answer on the site.
- No separate server: the bot runs inside the existing Next.js app on Vercel (outgoing calls + one webhook route). Free.

## Non-goals

- **Answering from Telegram.** The coach writes answers on the site, where the board and the move editor are. The bot only notifies and links.
- No email notifications.
- No notification settings ("mute", per-event toggles). Connected = all notifications for your role. Disconnect to stop.
- No bot features beyond notifications: no games, stats, or puzzles in the bot.
- No group chats. The bot works in private chats only; a message from a group is ignored.
- No "return to this page after login". A signed-out coach who taps the button lands on the login page, and after login goes home. The coach should stay signed in in the phone browser. _(Claude's call: a `next` redirect for login can be a small follow-up.)_

## User-facing behavior

### Connecting (any signed-in user)

1. `/profile` gets a new "Telegram" section below the usernames form.
2. Not connected: a short line "Get a Telegram message when …" (text differs for admin and student) and a **Connect Telegram** button.
3. The button calls a server action that creates a one-time code and opens `https://t.me/<bot_username>?start=<code>` in a new tab. Telegram shows the bot with a **Start** button.
4. The user taps Start. The bot replies: "Done! Telegram is connected to the account <nickname>." plus one line on what they will get.
5. Back on `/profile`, the section shows "Connected" and a **Disconnect** button. The page doesn't update by itself; it shows the new state on the next load. A small "Already pressed Start? Refresh the page" hint sits under the button while a code is pending. _(Claude's call: no polling.)_
6. The code is valid for 15 minutes and works once. An expired or used code gets the reply: "This link has expired. Open your profile on the site and press Connect again."
7. `/start` without a code (the user found the bot by name): "Hi! To get notifications, open your profile on <site> and press Connect Telegram."
8. One Telegram chat ↔ one account. Connecting a chat that is already linked to another account moves the link to the new account. Connecting a second chat to the same account replaces the first. _(Claude's call.)_

### Disconnecting

- **Disconnect** on `/profile` removes the link. The bot sends nothing more.
- `/stop` in the bot does the same and replies "Notifications are off. You can reconnect from your profile."
- If the user blocks the bot, Telegram rejects the next send with 403. The link is then deleted silently.

### Admin

- **New question:** the moment a student submits a question, every connected admin gets:

  > ❓ New question from **<nickname>**
  > Move: 23. Nf3
  > <first ~300 characters of the question's plain text>…
  >
  > [Open and answer]

  The button is a URL button to `/<locale>/admin?request=<id>`.
- `/admin?request=<id>` (new): the page opens on the tab that contains this request, scrolls to its card, and opens its coaching modal right away. Unknown id → the page behaves as today. _(The modal opening is the "go to the task and write the answer" step.)_
- **List:** `/new` in the bot (also in the bot's command menu as "Unanswered questions") replies with the unanswered questions, oldest first, at most 10. Each line has the nickname, move, and how long ago it was asked, with one URL button per question. More than 10: a last line "…and N more" with a button to `/admin`. None: "No unanswered questions 🎉".
- Non-admins who send `/new` get the help text (below), not the list.
- An admin who asks their own question gets the student notification for its answer like anyone else, and doesn't get the "new question" message about their own question. _(Claude's call.)_

### Student

- When the coach sends an answer, the asker (if connected) gets:

  > ✅ The coach answered your question about move 23. Nf3.
  >
  > [Open answer]

  The button goes to `/<locale>/coaching?tab=answered`. Opening the answer on the site marks it viewed as in spec 012. The answer text itself is not sent, so the student reads it next to the board. _(Claude's call.)_

### Other messages to the bot

- Any other text or command → help: "I send notifications from Chess Fundamentals. Commands: /new (admins only), /stop." Unlinked users get the "open your profile and press Connect" text instead.

### Language

Bot messages use the recipient's `user_profiles.preferred_locale` (falls back to `en`). The links use the same locale. Unlinked chats get the help in Russian when Telegram's `from.language_code` is `ru`, English otherwise.

## Data & types

### Migration `supabase/migrations/<timestamp>_telegram_links.sql`

- `public.telegram_links`
  - `user_id uuid primary key references auth.users(id) on delete cascade`
  - `chat_id bigint not null unique`
  - `created_at timestamptz not null default now()`
- `public.telegram_link_tokens`
  - `token text primary key` (random, URL-safe, ≤ 64 chars, as Telegram requires for `start`)
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `expires_at timestamptz not null`
- RLS on both. `telegram_links`: a user can `select` and `delete` only their own row. No insert/update policy: only the webhook writes, through the service-role client. `telegram_link_tokens`: no client policies at all (server-only).
- Why a separate table and not a column on `user_profiles`: users can update their own profile row, so they could write someone else's `chat_id` and spam that chat.
- **Prod:** apply with `npx supabase db push --linked` before the PR merges (memory `project_prod_migrations`).

### Env vars (`.env.local.example` + Vercel)

- `TELEGRAM_BOT_TOKEN`: from @BotFather.
- `TELEGRAM_BOT_USERNAME`: for the `t.me` link.
- `TELEGRAM_WEBHOOK_SECRET`: random string, checked on every webhook call.
- All three missing → the feature is off: no Telegram section on `/profile`, sends are no-ops, the webhook returns 404. Local dev and tests work without a bot.
- Use a separate dev bot for local work. Outgoing messages work from localhost. The webhook needs a public URL (a tunnel like ngrok), so local webhook testing is optional.

### Code (`lib/telegram/`)

- `api.ts`: `sendMessage(chatId, text, buttons?)` as a thin `fetch` to the Bot API, `parse_mode: 'HTML'`, with all user text HTML-escaped. It returns `'ok' | 'blocked' | 'error'` and never throws. `'blocked'` (403) deletes the link.
- `messages.ts`: pure builders for every bot text (new question, answer, list, help, connected, expired). Easy to unit test. Body preview cut at ~300 characters on a word boundary with `…`.
- `notify.ts`: `notifyAdminsOfQuestion(requestId)` and `notifyStudentOfAnswer(requestId)`. They load what they need with the service-role client and send.
- `link.ts`: `createLinkToken(userId)` and `consumeLinkToken(token, chatId)`.
- Hooks into existing actions in `lib/coaching/actions.ts`:
  - `createCoachingRequest`, after a successful insert: `after(() => notifyAdminsOfQuestion(id))`
  - `respondToRequest`, after a successful insert: `after(() => notifyStudentOfAnswer(request_id))`

  `after()` from `next/server` (see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`) sends after the response, so Telegram never slows the form down or breaks it. Errors are only logged.
- Server actions (`lib/telegram/actions.ts`): `startTelegramLink()` returns the `t.me` URL. `disconnectTelegram()` deletes the own row and revalidates `/profile`.

### Webhook `app/api/telegram/route.ts`

- `POST` only. Rejects with 401 unless the `X-Telegram-Bot-Api-Secret-Token` header equals `TELEGRAM_WEBHOOK_SECRET`.
- Handles private-chat text messages: `/start <code>`, `/start`, `/new`, `/stop`, anything else. Everything else is ignored.
- Always answers 200 to valid Telegram calls, even on internal errors (log them), so Telegram doesn't retry in a loop.
- `/api` is already outside the `proxy.ts` matcher, so locale and session middleware don't touch it.
- Registering the webhook and command menu is a one-time manual step: `scripts/telegram-setup.mjs` calls `setWebhook` (URL + secret, `allowed_updates: ["message"]`) and `setMyCommands`, reading the env vars. The steps go in the README.

## UI

- `/profile`: new client component `app/components/TelegramConnect/index.tsx`. Props: `connected`, `isAdmin`. It holds the Connect / Disconnect buttons and the pending hint. The page passes `connected` from a `telegram_links` select and hides the component when the bot is not configured.
- `/admin`: reads `request` from `searchParams`. It picks the tab containing it and passes `autoOpen` to that `CoachingAdminCard`. The card scrolls into view and starts with the modal open.
- Shadcn tokens only. Disconnect uses the `outline` button variant.

## i18n

Site (`messages/{en,ru}.json`, namespace `telegram`):

- `telegram.title`: "Telegram" / "Telegram"
- `telegram.descriptionStudent`: "Get a Telegram message when the coach answers your question." / "Получайте сообщение в Telegram, когда тренер ответит на ваш вопрос."
- `telegram.descriptionAdmin`: "Get a Telegram message for every new student question, and when your own questions are answered." / "Получайте сообщение в Telegram о каждом новом вопросе ученика и об ответах на ваши вопросы."
- `telegram.connect`: "Connect Telegram" / "Подключить Telegram"
- `telegram.pendingHint`: "Pressed Start in Telegram? Refresh this page." / "Нажали «Start» в Telegram? Обновите страницу."
- `telegram.connected`: "Connected" / "Подключено"
- `telegram.disconnect`: "Disconnect" / "Отключить"

Bot texts (namespace `telegram.bot`): `connected`, `expired`, `startNoCode`, `help`, `helpUnlinked`, `stopped`, `newQuestion`, `answered`, `listTitle`, `listEmpty`, `listMore`, `openAndAnswer`, `openAnswer`, `openAdmin`. Final wording during implementation, both locales structurally identical.

## Acceptance criteria

- [ ] `/profile` shows Connect when not linked and Connected + Disconnect when linked. Hidden when env vars are missing (test)
- [ ] `startTelegramLink` creates a 15-minute token and returns a `t.me/<bot>?start=<token>` URL (test)
- [ ] Webhook: wrong or missing secret → 401. `/start <valid>` links the chat and replies with the nickname. Expired or used code → expired reply. `/start` alone → help. `/stop` → unlinks (test)
- [ ] Linking a chat already used by another account moves it. Re-linking an account replaces its old chat (test)
- [ ] New question → every linked admin except the asker gets the message with a button to `/<locale>/admin?request=<id>` (test)
- [ ] Answer → the linked asker gets the message with a button to `/<locale>/coaching?tab=answered`. Unlinked asker → nothing sent (test)
- [ ] `/new` from an admin → up to 10 oldest unanswered with buttons, "…and N more" above 10, empty-state text at 0. From a non-admin → help (test)
- [ ] Telegram down / 500 → question and answer still save, the form shows success (test). 403 → the link is deleted (test)
- [ ] User text in bot messages is HTML-escaped (test)
- [ ] `/admin?request=<id>` opens the right tab and that card's modal (test)
- [ ] Message language follows `preferred_locale` (test)
- [ ] Manual check with a real dev bot: connect from `/profile`, ask a question as a student → admin gets it → tap the button → modal opens → answer → student gets the message
- [ ] `npm run lint`, `npm test`, `npm run build` pass
- [ ] Prod: migration applied (`npx supabase db push --linked`), env vars set in Vercel, `scripts/telegram-setup.mjs` run against the prod URL
