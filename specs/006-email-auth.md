# Spec: Email confirmation and password reset by nickname or email

Status: approved
Branch: feature/email-auth

## Problem

The app is about to be announced publicly. Until now auth emails went through Supabase's built-in mailer, which allows only a couple of emails per hour and delivers only to project-team addresses. The reset link was therefore broken for real users. On top of that:

- Sign-up never confirms the email. A typo in the address means the account can never recover its password.
- "Forgot password" accepts only a nickname. People remember their email more often than a nickname picked once.

## Goal

1. Every auth email is sent from `chesstrainer.notify@gmail.com` via Gmail SMTP: free, no card, about 500 emails/day.
   - Already configured on prod and verified with a real reset email on 2026-10-20.
2. A new account cannot log in until its email is confirmed.
3. "Forgot password" accepts a nickname **or** an email.
4. The confirmation link works when opened on a different device or browser than the one used to register (e.g. registered on a laptop, opened the email on a phone).

## Non-goals

- Logging in by email. Login stays nickname-only (user decision).
- Localized emails. All emails are in English only, because users are expected to read basic English (user decision).
- Own domain or a dedicated provider (Resend etc.). Switching later is an SMTP-settings change only.
- Changing an account's email, magic-link login, OAuth.

## User-facing behavior

### Register

1. The user submits nickname, email and password.
2. They are **not** logged in. Instead they see a "Check your email" screen:
   - "We sent a confirmation link to `a***@gmail.com`."
   - A **Resend email** button.
   - A link back to login.
3. They click the link in the email and land in the app logged in, with a toast "Email confirmed."
4. Registering with an email that already has an account shows the same "Check your email" screen. Supabase sends no email in that case, so the response does not reveal which emails are registered.

### Login before confirming

1. The user enters a valid nickname and password for an unconfirmed account.
2. The form shows "Confirm your email first." and a **Resend email** button.

### Forgot password

1. One field, labelled "Nickname or email".
2. If the input contains `@`, it is treated as an email. Otherwise it is a nickname, looked up as today.
3. The success message is the same in every case: "If that account exists, a reset email was sent."

### Links

1. An expired or already-used confirmation link lands on `/login` with "This link has expired. Log in to get a new one."
2. "Resend" pressed twice within a minute shows "Please wait a minute before requesting another email." This is Supabase's per-address rate limit.

## Data & types

- No DB migration.
  - Email stays in `auth.users`.
  - `public.user_profiles` does not get an email column, to avoid two copies drifting apart.
- Existing users were created while confirmations were off. Supabase auto-confirmed them (`email_confirmed_at` is set). They keep logging in.
  - Verify this locally before enabling on prod.
- Server actions in `lib/auth/actions.ts`:
  - `signUp`: on success, redirect to the check-email screen instead of `/`. Pass the masked email along. Never put the raw email in the URL.
  - `signIn`: map Supabase's `email_not_confirmed` error to the new message and add `suggest: 'resend'`.
  - `resendConfirmation(formData)`: new action. Takes a nickname (login screen) or an email (check-email screen) and calls `supabase.auth.resend({ type: 'signup', email })`. Returns a neutral success message either way.
  - `requestPasswordReset`: accept `identifier`. `@` means email, otherwise the nickname is looked up. The rest is unchanged.
- `app/[locale]/auth/confirm/route.ts`: also accept `?token_hash=…&type=…` and call `supabase.auth.verifyOtp({ token_hash, type })`. This works on any device because it needs no PKCE cookie. Keep the `?code=` branch for links already sitting in inboxes.
- Email templates use the token-hash link: `{{ .SiteURL }}/en/auth/confirm?token_hash={{ .TokenHash }}&type=…&next=…`.
  - The confirm-signup template uses `type=email`.
  - The reset-password template uses `type=recovery`.
  - Templates are checked in under `supabase/templates/` and wired in `supabase/config.toml` for local use. On prod they are pasted into the dashboard by hand.

## UI

- New route `app/[locale]/check-email/page.tsx` (server component plus a small client resend form).
- `AuthForm`: render a Resend button when `suggest === 'resend'`.
- Forgot-password form: rename the field label and placeholder, and rename the input to `identifier`.

## i18n

New or changed keys in `messages/{en,ru}.json` (the two files stay structurally identical):

- `auth.checkEmail.{title, body, resend, resendPending, resent, backToLogin}`
- `auth.errors.{emailNotConfirmed, linkExpired, resendTooSoon}`
- `auth.emailConfirmed` (toast after confirming)
- `auth.forgotPassword.{subtitle, identifier}` (changed copy)

## Prod rollout

These manual steps belong in the PR checklist. They are done by the user in the Supabase dashboard.

1. Authentication → Emails → Templates: paste the "Confirm signup" and "Reset password" templates.
2. Authentication → URL Configuration: make sure Site URL is `https://chess-trainer-amber.vercel.app` and that `/**` is allowed as a redirect.
3. Deploy (merge the PR).
4. Authentication → Providers → Email: turn on **Confirm email**. This step goes last, so that no one registers while the old code still logs unconfirmed users straight in.

## Acceptance criteria

- [ ] Register → check-email screen → link opened in another browser → logged in, sees "Email confirmed."
- [ ] Unconfirmed login shows "Confirm your email first." and Resend works.
- [ ] Forgot password works with a nickname, with an email, and with an unknown value. The message is identical in all three cases.
- [ ] Register with an already-used email shows the check-email screen and sends no email.
- [ ] Expired or used link lands on `/login` with the expired message.
- [ ] Existing users (created before confirmations) still log in.
- [ ] Tests under `tests/` for the changed actions, the confirm route, and the check-email page.
- [ ] `npm test`, `npm run lint`, `npm run build` pass.
