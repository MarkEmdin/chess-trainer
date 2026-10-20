# Email Confirmation & Reset by Nickname or Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New accounts must confirm their email before logging in, the confirmation link works on any device, and "Forgot password" accepts a nickname or an email.

**Architecture:**
- Templates and routing:
  - Supabase email templates link to our `/[locale]/auth/confirm` route with a `token_hash`. The route calls `verifyOtp`, which needs no PKCE cookie and so works cross-device.
  - The existing `?code=` branch stays for default-template links.
- Pending-confirmation state:
  - The email awaiting confirmation lives in an httpOnly cookie set by `signUp` / `signIn`.
  - The new `/check-email` page masks it, and `resendConfirmation` reads it.
  - No email ever goes in a URL.
- `requestPasswordReset` branches on `@`.

**Tech Stack:** Next.js 16 server actions + route handlers, `@supabase/ssr`, next-intl, Jest + RTL.

**Spec:** `specs/006-email-auth.md`

## Global Constraints

- Login stays nickname-only. Emails are English only.
- No DB migration. Email stays in `auth.users`.
- Neutral responses: forgot-password and resend never reveal whether an account exists.
- All user-facing copy goes through `messages/{en,ru}.json`, and both files keep an identical key tree.
  - The `ru` auth copy uses the formal «Вы» register, matching the existing keys.
- Navigation uses `@/i18n/navigation` (`redirect`, `Link`), never `next/navigation`.
- `npm run lint` must pass with zero warnings.

## Review Focus

1. A tampered `type` on `/auth/confirm` (e.g. `type=invite` or garbage) must not reach `verifyOtp`; it redirects to login with the expired notice.
2. `next` on the token-hash branch must get the same absolute-path guard as the code branch (open redirect).
3. An email with surrounding whitespace or upper case on forgot-password is trimmed and lowercased before `resetPasswordForEmail`.
4. `/check-email` with no `pending_email` cookie (direct visit, or the cookie expired) redirects to `/login` instead of rendering "sent to undefined".
5. `signIn` errors other than `email_not_confirmed` keep the existing `wrongPassword` mapping, so a wrong password never leaks confirmation state.

---

### Task 1: Pending-email helpers and the resend action

**Files:**
- Create: `lib/auth/maskEmail.ts`
- Create: `lib/auth/pendingEmail.ts`
- Modify: `lib/auth/actions.ts` (add `resendConfirmation`)
- Test: `tests/lib/auth/maskEmail.test.ts`, `tests/lib/auth/actions.test.ts`

**Interfaces:**
- Produces:
  - `maskEmail(email: string): string`
  - `PENDING_EMAIL_COOKIE = 'pending_email'`
  - `setPendingEmail(email: string): Promise<void>`: `cookies().set` with httpOnly, sameSite `lax`, path `/`, maxAge `3600`, and `secure` in production.
  - `getPendingEmail(): Promise<string | null>`
  - `resendConfirmation(_prev: AuthFormState, _fd: FormData): Promise<AuthFormState>`

- [ ] **Step 1: Write failing tests**
  - `maskEmail`:
    - `'alice@gmail.com'` → `'a***@gmail.com'`
    - `'a@x.io'` → `'a***@x.io'`
    - a string with no `@` → `'***'`
  - `resendConfirmation`, in `actions.test.ts`:
    - Extend the `next/headers` mock with a `cookies()` that returns `{ get, set }` jest fns.
    - Add `resend` to the mocked `auth`.
  - Cases:
    - cookie `user@example.com` → `resend` called with `{ type: 'signup', email: 'user@example.com' }` → `{ success: 'auth.checkEmail.resent' }`
    - no cookie → `resend` not called, same success
    - `resend` returns `{ error: { code: 'over_email_send_rate_limit' } }` → `{ error: 'auth.errors.resendTooSoon' }`
- [ ] **Step 2:** Run `npm test -- tests/lib/auth`.
  - Expected: FAIL. The modules or the export do not exist yet.
- [ ] **Step 3: Implement the three units.**
  - Any other `resend` error is logged with `console.error`, like the reset branch.
  - The action still returns the neutral success.
- [ ] **Step 4:** Run `npm test -- tests/lib/auth`.
  - Expected: PASS.
- [ ] **Step 5:** Add the i18n keys used here to both locale files: `auth.checkEmail.resent` and `auth.errors.resendTooSoon`. See the i18n table in Task 2. Commit `feat: pending-email cookie and resend confirmation action`.

### Task 2: Sign-up and login flow into `/check-email`

**Files:**
- Modify: `lib/auth/actions.ts` (`signUp`, `signIn`), `app/components/AuthForm/index.tsx`, `app/[locale]/login/page.tsx`
- Create: `app/[locale]/check-email/page.tsx`, `app/components/CheckEmail/index.tsx`
- Modify: `messages/en.json`, `messages/ru.json`
- Test: `tests/lib/auth/actions.test.ts`, `tests/app/components/AuthForm/index.test.tsx`, `tests/app/components/CheckEmail/index.test.tsx`

**Interfaces:**
- Consumes: `setPendingEmail`, `getPendingEmail`, `maskEmail`, `resendConfirmation` from Task 1.
- Produces:
  - `AuthFormState['suggest']` gains `'resend'`.
  - `AuthForm` gets an optional `notice?: string` prop.
  - `CheckEmail` (client, default export) takes `{ maskedEmail: string }`.

i18n keys (en / ru):

| key | en | ru |
|---|---|---|
| `auth.checkEmail.title` | Check your email | Проверьте почту |
| `auth.checkEmail.body` | We sent a confirmation link to {email}. Open it to finish creating your account. | Мы отправили ссылку для подтверждения на {email}. Откройте её, чтобы завершить регистрацию. |
| `auth.checkEmail.resend` | Resend email | Отправить ещё раз |
| `auth.checkEmail.resendPending` | Sending… | Отправка… |
| `auth.checkEmail.resent` | If the account needs confirming, a new email was sent. | Если аккаунт ждёт подтверждения, мы отправили новое письмо. |
| `auth.checkEmail.backToLogin` | Back to login | Назад ко входу |
| `auth.errors.emailNotConfirmed` | Confirm your email first. | Сначала подтвердите почту. |
| `auth.errors.resendSuggest` | Resend email? | Отправить письмо ещё раз? |
| `auth.errors.linkExpired` | This link has expired. Log in to get a new one. | Ссылка устарела. Войдите, чтобы получить новую. |
| `auth.errors.resendTooSoon` | Please wait a minute before requesting another email. | Подождите минуту перед повторной отправкой. |

- [ ] **Step 1: Write failing tests.**
  - `signUp`: mock `auth.signUp` → `{ error: null }`, rpc → `{ data: null }`, and `next-intl` redirect via `@/i18n/navigation`. Mock `redirect` as `jest.fn()`.
    - Asserts `cookies().set` was called with `'pending_email'` and the email.
    - Asserts `redirect` was called with `{ href: '/check-email', locale: 'en' }`.
  - `signIn`:
    - `signInWithPassword` → `{ error: { code: 'email_not_confirmed' }, data: { user: null } }` gives `{ error: 'auth.errors.emailNotConfirmed', suggest: 'resend' }` and sets the cookie.
    - `{ error: { code: 'invalid_credentials' } }` still gives `{ error: 'auth.errors.wrongPassword' }` and sets **no** cookie.
  - `AuthForm`:
    - `notice="X"` renders `X` in a `role="status"` element.
    - Mocking `useActionState` is awkward, so instead test the suggest link by rendering `CheckEmail`.
    - Keep this to the notice test.
  - `CheckEmail`:
    - Renders the title and the masked email.
    - Clicking "Resend email" calls the mocked `resendConfirmation`.
- [ ] **Step 2:** Run `npm test -- tests/lib/auth tests/app/components/AuthForm tests/app/components/CheckEmail`.
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `signUp`: after a successful `auth.signUp`, call `setPendingEmail(email)`, then `redirect({ href: '/check-email', locale })`.
    - Supabase returns success for an already-registered email when confirmations are on, which gives the neutral flow for free.
  - `signIn`: check `error?.code === 'email_not_confirmed'` before the generic branch.
  - `AuthForm`:
    - When `suggest === 'resend'`, render a `Link href="/check-email"` with `errors.resendSuggest`, the same way the other suggest links are rendered.
    - Render `notice` above the form.
  - `login/page.tsx`: read `searchParams` (a Promise in Next 16). If `error === 'link_expired'`, pass `notice={t('errors.linkExpired')}`.
  - `check-email/page.tsx` (server):
    - An authed user is redirected to `/`.
    - With no `getPendingEmail()`, redirect to `/login`.
    - Otherwise render `<CheckEmail maskedEmail={maskEmail(email)} />`.
  - `CheckEmail` uses `useActionState(resendConfirmation)`.
    - It shows success or error text under the button.
    - It uses the same layout shell as `ForgotPasswordForm` (max-w-sm card, header, back-to-login link).
- [ ] **Step 4:** Run the same tests, then the full `npm test`.
  - Expected: PASS.
- [ ] **Step 5:** Commit `feat: sign-up and unconfirmed login lead to check-email`.

### Task 3: Forgot password by nickname or email

**Files:**
- Modify: `lib/auth/actions.ts` (`requestPasswordReset`), `app/components/ForgotPasswordForm/index.tsx`, `messages/{en,ru}.json`
- Test: `tests/lib/auth/actions.test.ts`

**Interfaces:**
- Form field name: `identifier` (was `nickname`).

i18n:
- `auth.forgotPassword.identifier`: "Nickname or email" / "Никнейм или email"
- `auth.forgotPassword.subtitle`: "Enter your nickname or email and we'll send you a reset link." / "Введите никнейм или email — мы отправим ссылку для сброса пароля."

- [ ] **Step 1: Update the existing tests to post `identifier` and add new ones.**
  - `' User@Example.com '` → rpc **not** called, and `resetPasswordForEmail` called with `'user@example.com'`.
  - The unknown-email case is covered by Supabase, which is silent for unknown addresses. Assert the neutral success.
- [ ] **Step 2:** Run `npm test -- tests/lib/auth/actions.test.ts`.
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The identifier is the trimmed value, lowercased.
  - If it contains `@`, it is the email. Otherwise look it up with `lookup_email_by_nickname`.
  - The redirect URL and the neutral message are unchanged.
  - Form: `FormField` with `name="identifier"`, `type="text"`, `autoComplete="username"`, and label `forgotPassword.identifier`.
- [ ] **Step 4:** Run `npm test -- tests/lib/auth`.
  - Expected: PASS.
- [ ] **Step 5:** Commit `feat: password reset accepts nickname or email`.

### Task 4: Token-hash confirm route and the "Email confirmed" page

**Files:**
- Modify: `app/[locale]/auth/confirm/route.ts`
- Create: `app/[locale]/email-confirmed/page.tsx`
- Modify: `lib/auth/getUser.ts` (add `preferredLocale`), `messages/{en,ru}.json`
- Test: `tests/app/auth/confirm/route.test.ts`, `tests/app/email-confirmed/page.test.tsx` (if the server page is awkward to render, test the redirect logic only)

**Interfaces:**
- `AuthedUser` gains `preferredLocale: string | null`.

i18n:
- `auth.emailConfirmed.title`: "Email confirmed" / "Почта подтверждена"
- `auth.emailConfirmed.body`: "You're logged in. Welcome!" / "Вы вошли в аккаунт. Добро пожаловать!"
- `auth.emailConfirmed.cta`: "Start learning" / "Начать обучение"

- [ ] **Step 1: Write failing route tests.** Mock `verifyOtp`. Cases:
  - `?token_hash=h&type=email&next=%2Fen%2Femail-confirmed` → `verifyOtp({ token_hash: 'h', type: 'email' })` → redirect `/en/email-confirmed`
  - `type=recovery` → allowed
  - `type=invite`, or `type` missing → `verifyOtp` not called → `/en/login?error=link_expired`
  - `verifyOtp` error → `/en/login?error=link_expired`
  - `next=https://evil.com` → `/en`
  - The existing code-branch failure now also redirects to `/en/login?error=link_expired`. Update that test.
- [ ] **Step 2:** Run `npm test -- tests/app/auth`.
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Allowlist: `const OTP_TYPES = ['email', 'recovery'] as const`.
  - Order: the token-hash branch first, then the code branch, then the expired redirect.
  - `email-confirmed/page.tsx`:
    - With no user, redirect to `/login`.
    - If `user.preferredLocale` is set and differs from the current locale, redirect to `/email-confirmed` in that locale.
    - Otherwise render the title, body, and a `Link href="/lessons"` button.
- [ ] **Step 4:** Run `npm test`.
  - Expected: PASS.
- [ ] **Step 5:** Commit `feat: cross-device email confirmation via token hash`.

### Task 5: Local Supabase templates, config, and manual pass

**Files:**
- Create: `supabase/templates/confirmation.html`, `supabase/templates/recovery.html`
- Modify: `supabase/config.toml`, `specs/006-email-auth.md` (Status: done, tick the boxes)

- [ ] **Step 1: Write the templates.** Both are plain English and minimal inline-styled HTML: a heading, one sentence, a button link, and "If you didn't request this, ignore this email."
  - Confirmation link: `{{ .SiteURL }}/en/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/en/email-confirmed`
  - Recovery link: `{{ .SiteURL }}/en/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/en/reset-password`
- [ ] **Step 2: Update `config.toml`.**
  - `enable_confirmations = true` under `[auth.email]`.
  - `max_frequency = "60s"`, to match prod's resend limit.
  - Add `[auth.email.template.confirmation]` with subject "Confirm your Chess Trainer account" and `content_path = "./supabase/templates/confirmation.html"`.
  - Add `[auth.email.template.recovery]` with subject "Reset your Chess Trainer password" and its own path.
- [ ] **Step 3:** Run `npx supabase stop && npx supabase start` so the config is applied.
  - Expected: the stack is up. The DB volume is kept, because there is no `--no-backup`.
- [ ] **Step 4: Manual pass** with `npm run dev`, reading mail at Inbucket `http://127.0.0.1:54324`. Each item in the spec's Acceptance criteria:
  - Register, then open the link in a different browser profile.
  - Log in unconfirmed, then resend.
  - Forgot password by nickname, by email, and with an unknown value.
  - Register with a duplicate email.
  - Reuse an already-used link.
  - Log in as existing `qa_student`, who was created before confirmations.
- [ ] **Step 5:** Run `npm test && npm run lint && npm run build`.
  - Expected: all green.
  - Mark the spec done and commit `chore: local email templates and confirmations on`.
