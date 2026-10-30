# Telegram Bot Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users link a Telegram chat from `/profile`. Admins get each new student question with a button that opens it on `/admin`, plus a `/new` list. Students get an "answered" message.

**Architecture:** No bot server. Outgoing messages are `fetch` calls to the Bot API, made from the coaching server actions through `after()`. Incoming messages hit one route handler, `app/api/telegram/route.ts`, registered as the webhook. Links and one-time codes live in two RLS-locked tables, and only the service-role client writes to them.

**Tech Stack:** Next.js 16 (`after`, route handlers), Supabase (service-role client), next-intl `createTranslator`, Jest + RTL

**Spec:** `specs/014-telegram-bot.md`

## Global Constraints

- Feature is off unless `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` are all set. Off means: no profile section, sends are no-ops, webhook returns 404.
- Link code: URL-safe, ≤ 64 chars, valid 15 minutes, single use.
- `parse_mode: 'HTML'`. Every user-supplied string (nickname, body, move) goes through `escapeHtml` before it enters a message.
- Question preview ≈ 300 chars, cut on a word boundary, ends with `…`.
- `/new` shows at most 10, oldest first, then "…and N more".
- Bot language = recipient's `preferred_locale` (`'ru'` → ru, anything else → en). Unlinked chat: `from.language_code === 'ru'` → ru.
- Links: `${origin}/${locale}/admin?request=${id}`, `${origin}/${locale}/coaching?tab=answered`, `${origin}/${locale}/admin`, `${origin}/${locale}/profile`.
- Sending never throws and never blocks or fails a coaching action.
- The webhook answers 200 to every request that has the right secret, even on internal errors.
- `messages/en.json` and `messages/ru.json` stay structurally identical (`tests/messages.test.ts` enforces it).

## Review Focus

- The same user taps the Start link a second time (code already used) → "link expired" reply, and the existing link stays intact. Test in Task 3.
- A question body with `<b>`, `&`, emoji, or 5000 chars → the message is escaped and under Telegram's 4096 limit, so the send doesn't fail with 400. Test in Task 2.
- `/new@<bot_username>` (what Telegram sends from menus in some clients) → treated as `/new`. Test in Task 5.
- An admin who was demoted to `user` but is still linked → gets no more new-question pushes, and `/new` gives them the help text. The role is read at send time. Tests in Tasks 4 and 5.
- `edited_message`, a sticker, or a group-chat message → 200, nothing sent. Test in Task 5.

---

### Task 1: Tables, config, site URL

**Files:**
- Create: `supabase/migrations/20261030120000_telegram_links.sql`
- Create: `lib/telegram/config.ts`
- Create: `lib/site.ts`
- Modify: `app/[locale]/layout.tsx` (import `SITE_URL` from `@/lib/site` instead of the local const)
- Modify: `.env.local.example` (three `TELEGRAM_*` lines with a comment: dev bot locally, prod bot in Vercel)
- Test: `tests/lib/telegram/config.test.ts`

**Interfaces:**
- Produces: `telegramConfig(): { token: string; username: string; secret: string } | null`, `SITE_URL: string` (`'https://chess-trainer-amber.vercel.app'`), tables `telegram_links(user_id uuid pk → auth.users on delete cascade, chat_id bigint not null unique, created_at timestamptz not null default now())` and `telegram_link_tokens(token text pk, user_id uuid not null → auth.users on delete cascade, expires_at timestamptz not null)`.

- [ ] **Step 1: Failing tests**: `returns null when any variable is missing` (set two of three) and `returns the three values when all are set`. Save and restore `process.env` per test.
- [ ] **Step 2:** `npm test -- telegram/config` → FAIL (module missing).
- [ ] **Step 3:** Implement `telegramConfig` and `SITE_URL`. Write the migration:
  - `enable row level security` on both tables.
  - `telegram_links`: policies `select` and `delete` `to authenticated using (user_id = auth.uid())`.
  - `telegram_link_tokens`: no policies.
  - `revoke all` on both from `anon`, matching how earlier migrations treat `anon`.
- [ ] **Step 4:** `npm test -- telegram/config` → PASS. Then `npx supabase db reset`. Check in `psql` / Studio that both tables exist and that the anon key can't read either.
- [ ] **Step 5:** Commit `feat: telegram link tables and config`.

### Task 2: Bot API client and message texts

**Files:**
- Create: `lib/telegram/api.ts`, `lib/telegram/messages.ts`
- Modify: `messages/en.json`, `messages/ru.json` (namespace `telegram`, see copy below)
- Test: `tests/lib/telegram/api.test.ts`, `tests/lib/telegram/messages.test.ts`

**Interfaces:**
- Consumes: `telegramConfig()` (Task 1).
- Produces:
  - `api.ts`:
    - `type Button = { text: string; url: string }`
    - `type BotMessage = { text: string; buttons?: Button[] }`
    - `sendMessage(chatId: number, msg: BotMessage): Promise<'ok' | 'blocked' | 'error'>`
    - `escapeHtml(s: string): string`
  - `messages.ts`:
    - `type BotLocale = 'en' | 'ru'`
    - `toBotLocale(x: string | null | undefined): BotLocale`
    - `newQuestionMessage(locale, { nickname, moveSan, body, url }): BotMessage`
    - `answeredMessage(locale, { moveSan, url }): BotMessage`
    - `questionListMessage(locale, items: { nickname: string; moveSan: string; createdAt: string; url: string }[], adminUrl: string, now: Date): BotMessage` (gets the full oldest-first list and slices it itself)
    - `connectedMessage(locale, nickname: string, isAdmin: boolean): BotMessage`
    - `infoMessage(locale, key: 'expired' | 'startNoCode' | 'help' | 'helpUnlinked' | 'stopped', profileUrl: string): BotMessage`
    - `previewBody(body: string): string`

- [ ] **Step 1: Failing tests**
  - api:
    - `posts to /bot<token>/sendMessage with chat_id, HTML parse mode, one button per row`: mock `global.fetch`, assert the URL and the body `{ chat_id: 42, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text, url }]] }, link_preview_options: { is_disabled: true } }`.
    - `returns 'blocked' on 403`, `'error' on 500`, `'error' when fetch rejects` (no throw).
    - `returns 'error' without calling fetch when config is null`.
    - `escapeHtml('<a & b>')` → `'&lt;a &amp; b&gt;'`.
  - messages:
    - `newQuestionMessage escapes nickname and body`: nickname `<script>` → text contains `&lt;script&gt;`, has no `<script>`, and the button url is passed through.
    - `previewBody cuts a 5000-char body to ≤ 301 chars ending with …, on a space`.
    - `questionListMessage with 12 items` → 10 item buttons + an "admin" button, text contains `2` (the "and N more" count).
    - `questionListMessage with 0 items` → the empty text, no buttons.
    - `uses Russian copy for 'ru'`: `toBotLocale('ru')` → ru text. `toBotLocale(null)` and `toBotLocale('de')` → `'en'`.
- [ ] **Step 2:** `npm test -- lib/telegram` → FAIL.
- [ ] **Step 3:** Implement.
  - `sendMessage` reads the token from `telegramConfig()`. It omits `reply_markup` when there are no buttons and wraps everything in try/catch.
  - Texts come from `createTranslator({ locale, messages, namespace: 'telegram.bot' })` (from `next-intl`), with `messages` imported from `@/messages/<locale>.json`.
  - Values are escaped before being passed in. Bold is applied in code (`<b>${escapeHtml(nickname)}</b>`), so the JSON contains no tags.
  - "How long ago" uses `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })`: minutes if < 60 min, hours if < 24 h, otherwise days.
  - Copy (en / ru):
    - `newQuestion`: "❓ New question from {nickname}\nMove: {move}\n\n{body}" / "❓ Новый вопрос от {nickname}\nХод: {move}\n\n{body}"
    - `answered`: "✅ The coach answered your question about move {move}." / "✅ Тренер ответил на ваш вопрос о ходе {move}."
    - `listTitle`: "Unanswered questions: {count}" / "Вопросов без ответа: {count}"
    - `listEmpty`: "No unanswered questions 🎉" / "Вопросов без ответа нет 🎉"
    - `listMore`: "…and {count} more" / "…и ещё {count}"
    - `connected`: "Done! Telegram is connected to the account {nickname}." / "Готово! Telegram подключён к аккаунту {nickname}."
    - `connectedStudent`: "I'll write when the coach answers your questions." / "Я напишу, когда тренер ответит на ваши вопросы."
    - `connectedAdmin`: "I'll write about every new student question. /new shows the unanswered ones." / "Я буду писать о каждом новом вопросе ученика. /new — список вопросов без ответа."
    - `expired`: "This link has expired. Open your profile and press Connect Telegram again." / "Ссылка устарела. Откройте профиль и нажмите «Подключить Telegram» ещё раз."
    - `startNoCode`: "Hi! To get notifications, open your profile on the site and press Connect Telegram." / "Привет! Чтобы получать уведомления, откройте профиль на сайте и нажмите «Подключить Telegram»."
    - `help`: "I send notifications from Chess Fundamentals. Commands: /new (admins only), /stop." / "Я присылаю уведомления от Chess Fundamentals. Команды: /new (только для админов), /stop."
    - `helpUnlinked`: same as `startNoCode`.
    - `stopped`: "Notifications are off. You can reconnect from your profile." / "Уведомления выключены. Подключиться снова можно в профиле."
    - `openAndAnswer`: "Open and answer" / "Открыть и ответить"
    - `openAnswer`: "Open answer" / "Открыть ответ"
    - `openAdmin`: "All questions" / "Все вопросы"
    - `openProfile`: "Open profile" / "Открыть профиль"
  - `expired`, `startNoCode`, `helpUnlinked` and `stopped` carry the `openProfile` button.
  - Site keys from the spec's i18n section go in the same commit (`telegram.title`, `descriptionStudent`, `descriptionAdmin`, `connect`, `pendingHint`, `connected`, `disconnect`) plus `telegram.errors.notAuthenticated` ("You must be signed in" / "Нужно войти в аккаунт").
- [ ] **Step 4:** `npm test -- lib/telegram messages.test` → PASS.
- [ ] **Step 5:** Commit `feat: telegram api client and bot messages`.

### Task 3: Linking codes

**Files:**
- Create: `lib/telegram/link.ts`
- Test: `tests/lib/telegram/link.test.ts`

**Interfaces:**
- Consumes: `createAdminClient()` from `@/lib/supabase/admin`.
- Produces:
  - `createLinkToken(userId: string): Promise<string>`
  - `consumeLinkToken(token: string, chatId: number): Promise<{ nickname: string; isAdmin: boolean; locale: BotLocale } | null>`
  - `findLinkByChat(chatId: number): Promise<{ userId: string; isAdmin: boolean; locale: BotLocale } | null>`
  - `unlinkChat(chatId: number): Promise<void>`

- [ ] **Step 1: Failing tests**, with a chainable mock of the admin client in the style of `tests/lib/coaching/actions.test.ts`, recording calls per table:
  - `createLinkToken deletes the user's old tokens, inserts one expiring in 15 minutes, returns a [A-Za-z0-9_-]{20,64} string`. Use fake timers.
  - `consumeLinkToken returns null for an unknown or expired token and writes nothing to telegram_links`.
  - `consumeLinkToken on a valid token deletes the token, deletes any link with this chat_id, upserts { user_id, chat_id } on user_id, returns nickname/isAdmin/locale`.
  - `a second consume of the same token returns null` (Review Focus: the existing link stays, no delete on `telegram_links`).
  - `unlinkChat deletes by chat_id`.
- [ ] **Step 2:** `npm test -- telegram/link` → FAIL.
- [ ] **Step 3:** Implement.
  - Token: `randomBytes(24).toString('base64url')`.
  - The validity check is `.gt('expires_at', new Date().toISOString())`.
  - Profile fields come from `user_profiles` (`nickname, role, preferred_locale`).
- [ ] **Step 4:** `npm test -- telegram/link` → PASS.
- [ ] **Step 5:** Commit `feat: one-time telegram link codes`.

### Task 4: Notifications from coaching actions

**Files:**
- Create: `lib/telegram/notify.ts`
- Modify: `lib/coaching/actions.ts` (`createCoachingRequest`, `respondToRequest`)
- Test: `tests/lib/telegram/notify.test.ts`, `tests/lib/coaching/actions.test.ts`

**Interfaces:**
- Consumes: `sendMessage` and the message builders (Task 2), `unlinkChat` (Task 3), `telegramConfig` (Task 1), `SITE_URL` (Task 1).
- Produces:
  - `notifyAdminsOfQuestion(requestId: string, origin: string): Promise<void>`
  - `notifyStudentOfAnswer(requestId: string, origin: string): Promise<void>`
  - `unansweredList(origin: string, locale: BotLocale, now: Date): Promise<BotMessage>` (for the webhook)

- [ ] **Step 1: Failing tests**
  - notify, with mocked admin client + mocked `sendMessage`:
    - `sends to every linked admin except the asker, in each admin's locale, with the admin?request=<id> button`: two admins (`en`, `ru`), one of them the asker → one send, `ru`.
    - `skips admins without a link and users whose role is not admin` (Review Focus: a demoted user who is still linked).
    - `answer → sends to the linked asker with the coaching?tab=answered button`.
    - `answer → no send when the asker has no link`.
    - `'blocked' result → unlinkChat(chatId)`.
    - `sendMessage rejecting or the DB erroring → resolves, logs with console.error`.
    - `no-op when telegramConfig() is null`.
    - `unansweredList returns requests without responses, oldest first, with nicknames`.
  - actions (extend the existing file):
    - Mock `next/server` → `after: (fn) => fn()`.
    - Mock `next/headers` → origin `https://site.test`.
    - Mock `@/lib/telegram/notify`.
    - `createCoachingRequest success → notifyAdminsOfQuestion('new-id', 'https://site.test')`.
    - `respondToRequest success → notifyStudentOfAnswer('r1', 'https://site.test')`.
    - `validation error → no notify`.
    - `notify rejecting → action still returns success`.
- [ ] **Step 2:** `npm test -- telegram/notify coaching/actions` → FAIL.
- [ ] **Step 3:** Implement.
  - Both notify functions return early when `telegramConfig()` is null and wrap the whole body in try/catch.
  - Admins are found with a `user_profiles` `role = 'admin'` select, then a `telegram_links` `.in('user_id', ids)` select.
  - In the actions, read `origin` with `(await headers()).get('origin') ?? SITE_URL` before the call: `after(() => notifyAdminsOfQuestion(data.id, origin))` / `after(() => notifyStudentOfAnswer(request_id, origin))`.
  - Check `after.md` in `node_modules/next/dist/docs` for the import (`import { after } from 'next/server'`).
- [ ] **Step 4:** `npm test -- telegram coaching/actions` → PASS.
- [ ] **Step 5:** Commit `feat: telegram notifications for new questions and answers`.

### Task 5: Webhook route

**Files:**
- Create: `app/api/telegram/route.ts`
- Test: `tests/app/api/telegram/route.test.ts` (`@jest-environment node`, like `tests/app/auth/confirm/route.test.ts`)

**Interfaces:**
- Consumes: `telegramConfig`, `consumeLinkToken`, `findLinkByChat`, `unlinkChat`, `unansweredList`, `sendMessage`, the message builders.
- Produces: `POST(req: NextRequest): Promise<Response>`

- [ ] **Step 1: Failing tests.** Mock `lib/telegram/link`, `notify` and `api`, build a `NextRequest` with a JSON `{ message: { chat: { id: 7, type: 'private' }, from: { language_code: 'ru' }, text } }`.
  - `404 when telegramConfig is null`.
  - `401 without or with a wrong X-Telegram-Bot-Api-Secret-Token`.
  - `/start <code> valid → consumeLinkToken(code, 7) and connectedMessage sent`.
  - `/start <code> invalid → expired message`.
  - `/start alone → startNoCode in ru` (from `language_code`).
  - `/new from a linked admin → unansweredList result sent`.
  - `/new@somebot same as /new` (Review Focus).
  - `/new from a linked non-admin → help`.
  - `/stop → unlinkChat(7) + stopped`.
  - `random text, unlinked → helpUnlinked`.
  - `edited_message / sticker (no text) / chat.type 'group' → 200, no send` (Review Focus).
  - `consumeLinkToken throws → still 200`.
- [ ] **Step 2:** `npm test -- api/telegram` → FAIL.
- [ ] **Step 3:** Implement.
  - Command parse: first token of `text`, with `@…` stripped; the argument is the rest after the first space.
  - The language for unlinked chats comes from `from.language_code`. For linked chats it comes from `findLinkByChat`.
  - The links use `new URL(req.url).origin`.
- [ ] **Step 4:** `npm test -- api/telegram` → PASS.
- [ ] **Step 5:** Commit `feat: telegram webhook`.

### Task 6: Connect / disconnect on the profile

**Files:**
- Create: `lib/telegram/actions.ts` (`'use server'`)
- Create: `app/components/TelegramConnect/index.tsx` (`'use client'`)
- Modify: `app/[locale]/profile/page.tsx`
- Test: `tests/lib/telegram/actions.test.ts`, `tests/app/components/TelegramConnect/index.test.tsx`

**Interfaces:**
- Consumes: `createLinkToken` (Task 3), `telegramConfig` (Task 1), `getAuthedUser`.
- Produces:
  - `startTelegramLink(): Promise<{ url: string } | { error: string }>`
  - `disconnectTelegram(): Promise<void>`
  - `<TelegramConnect connected: boolean isAdmin: boolean />`

- [ ] **Step 1: Failing tests**
  - actions:
    - `signed out → { error: 'telegram.errors.notAuthenticated' }`.
    - `signed in → { url: 'https://t.me/<username>?start=<token>' }`.
    - `disconnect deletes the own telegram_links row (server client, eq user_id) and revalidates '/[locale]/profile'`.
  - component:
    - `not connected → admin or student description + Connect button`.
    - `clicking Connect opens a tab and sends it to the returned url, then shows pendingHint`. Mock `window.open` to return `{ location: { href: '' }, close: jest.fn() }`.
    - `action error → the tab is closed and the error text shown`.
    - `connected → "Connected" + Disconnect, click calls disconnectTelegram`.
  - page: `profile page hides the Telegram section when telegramConfig() is null` (add `tests/app/profile/page.test.tsx`).
- [ ] **Step 2:** `npm test -- TelegramConnect telegram/actions` → FAIL.
- [ ] **Step 3:** Implement.
  - Open the tab synchronously in the click handler (`window.open('', '_blank')`) and only then await the action. Opening after an await gets blocked as a popup on mobile.
  - Disconnect is `Button variant="outline"`. Pending state comes from `useTransition`.
  - The page renders the section in a `Card` below `ProfileForm`, only when `telegramConfig()` is non-null. `connected` comes from `telegram_links` `select('user_id').eq('user_id', user.id).maybeSingle()`.
- [ ] **Step 4:** `npm test -- TelegramConnect telegram/actions` → PASS.
- [ ] **Step 5:** Commit `feat: connect telegram from the profile`.

### Task 7: `/admin?request=<id>` opens that question

**Files:**
- Modify: `app/[locale]/admin/page.tsx`, `app/components/CoachingAdminCard/index.tsx`
- Test: `tests/app/admin/page.test.tsx`, `tests/app/components/CoachingAdminCard/CoachingAdminCard.test.tsx`

**Interfaces:**
- Produces: `CoachingAdminCard` prop `autoOpen?: boolean`

- [ ] **Step 1: Failing tests**
  - page:
    - `?request=<id of an answered request> → the answered tab is selected and that card gets autoOpen`. The card mock renders `data-autoopen`.
    - `?request=<unknown> → behaves as today`.
    - `explicit ?tab is overridden only when request matches`.
  - card:
    - `autoOpen → modal stub rendered on mount and scrollIntoView called`. Stub `Element.prototype.scrollIntoView`.
    - `without autoOpen → closed`.
- [ ] **Step 2:** `npm test -- admin/page CoachingAdminCard` → FAIL.
- [ ] **Step 3:** Implement.
  - Page: `tab` = the tab that contains the requested id, else the current rule.
  - Card: `useState(autoOpen ?? false)`, a `ref` on the `Card` root, and `useEffect(() => { if (autoOpen) ref.current?.scrollIntoView({ block: 'center' }) }, [autoOpen])`.
- [ ] **Step 4:** `npm test -- admin/page CoachingAdminCard` → PASS.
- [ ] **Step 5:** Commit `feat: open a question on /admin from a link`.

### Task 8: Setup script, docs, full check

**Files:**
- Create: `scripts/telegram-setup.mjs`
- Modify: `README.md` (section "Telegram bot": create the bots, env vars, run the script, local tunnel note)
- Modify: `specs/014-telegram-bot.md` (tick acceptance criteria, `Status: done`)

- [ ] **Step 1:** Write the script. Usage: `node --env-file=.env.local scripts/telegram-setup.mjs https://<site>`.
  - Calls `setWebhook` with `{ url: <site>/api/telegram, secret_token, allowed_updates: ['message'], drop_pending_updates: true }`.
  - Calls `setMyCommands` twice: default English, and `language_code: 'ru'`.
    - en: `new` "Unanswered questions (admins)", `stop` "Turn notifications off".
    - ru: `new` "Вопросы без ответа (админы)", `stop` "Выключить уведомления".
  - Prints each API response and exits 1 on `ok: false`.
- [ ] **Step 2:** `npm run lint`, `npm test`, `npm run build` → all pass, zero warnings.
- [ ] **Step 3: Manual check** with the dev bot and a tunnel (`npx ngrok http 3000` or similar). Run the script with the tunnel URL, then:
  1. Connect from `/profile` as admin and as a student.
  2. As the student, ask a question → admin message arrives.
  3. Tap the button → the modal is open on `/admin`.
  4. Answer → the student message arrives.
  5. `/new` and `/stop` work.
  6. Block the bot → the next send deletes the link.
- [ ] **Step 4:** Commit `docs: telegram bot setup`.
- [ ] **Step 5 (before merge, by the user):**
  1. `npx supabase db push --linked`.
  2. Set the 3 env vars in Vercel (prod bot).
  3. After deploy, run the script with the prod URL.
