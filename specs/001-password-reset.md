# Spec: Password reset

Status: draft
Branch: feature/password-reset

## Problem

Users log in with a nickname + password (`lib/auth/actions.ts` `signIn`). There is no way to recover
access if a password is forgotten — no "forgot password" link, no reset flow.

## Goal

A user who forgets their password can request a reset by nickname, receive an email, and set a new
password. No account lockout path otherwise.

## Non-goals

- Custom SMTP / transactional email provider setup (using Supabase's built-in email sender — free,
  rate-limited, acceptable at current traffic)
- Magic-link / passwordless login
- Changing password from within an already-authenticated session (that's a separate "account settings"
  feature, not reset)

## User-facing behavior

1. On `/login`, a "Forgot password?" link appears below the form
2. Link goes to `/forgot-password` — form asks for **nickname** (not email, consistent with how login
   works)
3. On submit: always show a neutral success message ("If that account exists, an email was sent") —
   never reveal whether the nickname exists (avoids account enumeration)
4. User clicks the link in the email → Supabase's hosted verify endpoint redirects to our app's
   `/auth/confirm?code=...&next=/reset-password` route, which exchanges the code for a session and
   redirects to `/reset-password`
5. Form asks for new password (+ confirm) → on submit, password is updated → form shows an inline
   success message with a link back to `/login` (no auto-redirect — the codebase has no cross-page
   flash-message mechanism, so this stays on-page instead of inventing one)

## Data & types

- No new DB tables. Reuses the existing `lookup_email_by_nickname` RPC (already used by `signIn`/`signUp`)
  to translate nickname → email server-side, same reasoning as the existing code (anon users have no
  SELECT on other profiles via RLS).
- `AuthFormState` type in `lib/auth/actions.ts` is reused for the new actions' return shape.

## Server actions (`lib/auth/actions.ts`)

- `requestPasswordReset(_prev, formData)`: reads `nickname`, looks up email via admin RPC, calls
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/<locale>/auth/confirm?next=... })`.
  Returns the same neutral success message regardless of whether the nickname matched (`AuthFormState`
  gains a `{ success: string }` variant alongside the existing `{ error, suggest? }` one).
- `updatePassword(_prev, formData)`: reads `password` + `confirmPassword`, validates they match and meet
  the minimum length (6, matching the existing client-side `minLength`), calls
  `supabase.auth.updateUser({ password })` using the session already present from the recovery link.
  Returns `{ success: ... }` on success (rendered inline by the form) or `{ error: ... }` on failure.
- `app/[locale]/auth/confirm/route.ts` (new route handler, not a server action): receives the PKCE
  `code` from Supabase's hosted verify redirect, calls `supabase.auth.exchangeCodeForSession(code)`,
  redirects to the `next` query param on success or `/<locale>/login` on failure/missing code. `next`
  is validated to be an absolute path (must start with `/`) before use, to close an open-redirect
  vector — the param rides on an emailed link and is attacker-editable.
- On a successful password update, `updatePassword` also calls `supabase.auth.signOut({ scope: 'others' })`
  so a stolen session elsewhere doesn't survive the reset. On failure, a missing/expired recovery
  session (`AuthSessionMissingError` — the realistic case when the link is opened in a different
  browser than the one that requested it, since the PKCE verifier cookie is per-browser) maps to a
  translated `auth.errors.sessionExpired` message instead of leaking the raw Supabase error string.

## UI

- `app/[locale]/forgot-password/page.tsx` — Server Component page wrapping a new client form
- `app/[locale]/reset-password/page.tsx` — same shape
- New components: `app/components/ForgotPasswordForm/index.tsx`, `app/components/ResetPasswordForm/index.tsx`
  — follow the existing `AuthForm` pattern (uses `FormField`, `useActionState`)
- `AuthForm` (or `login/page.tsx`, wherever the login form renders) gets a "Forgot password?" link to
  `/forgot-password`

## i18n

New keys under `auth` namespace in both `messages/en.json` and `messages/ru.json`:

```
auth.forgotPassword.title
auth.forgotPassword.subtitle
auth.forgotPassword.submit
auth.forgotPassword.pending
auth.forgotPassword.success   // neutral message, shown regardless of match
auth.forgotPassword.backToLogin
auth.login.forgotPasswordLink // the link text on the login form

auth.resetPassword.title
auth.resetPassword.subtitle
auth.resetPassword.newPassword
auth.resetPassword.confirmPassword
auth.resetPassword.submit
auth.resetPassword.pending
auth.resetPassword.success     // shown inline on /reset-password, with a link using the shared
                                // auth.forgotPassword.backToLogin label

auth.errors.passwordMismatch
auth.errors.passwordTooShort
auth.errors.sessionExpired     // shown on /reset-password when the recovery session is missing/expired
                                // (most commonly: link opened in a different browser than the one
                                // that requested it)
```

## Supabase config (manual, no code)

- No SMTP setup for now (default built-in email sender — rate-limited but free; revisit if the project
  exceeds Supabase's default hourly email cap)
- Add the redirect URL to the allowlist in Supabase Dashboard → Auth → URL Configuration, for every
  deployed origin (localhost + Vercel prod URL). The actual redirect target is
  `<origin>/<locale>/auth/confirm` with a `next`/`code` query string — **not** a bare `/reset-password`
  — so use a wildcard pattern (e.g. `http://localhost:3000/**` and the deployed origin's equivalent) or
  the allowlist will reject the link and it'll silently fall back to the Site URL, landing on the
  homepage instead of the reset flow.
- Enable **Auth → Secure password change** in the dashboard. Without it, any already-authenticated
  session can change its own password at `/reset-password` with no re-authentication, since that page
  deliberately has no auth guard (see Non-goals — the recovery-session exchange at `/auth/confirm`
  already counts as a recent sign-in, so this doesn't break the intended reset flow).
- Known limitation, not fixed by this spec: the PKCE verifier cookie is per-browser, so requesting a
  reset on one device/browser and opening the email link on another always fails with a translated
  "link expired" message, not a working reset. Revisit with Supabase's stateless `token_hash` +
  `verifyOtp` pattern (requires customizing the recovery email template) if cross-device resets become
  a real need.

## Acceptance criteria

- [ ] "Forgot password?" link visible on `/login`
- [ ] Submitting a valid nickname shows neutral success message, triggers Supabase reset email
- [ ] Submitting an unknown nickname shows the same neutral success message (no enumeration)
- [ ] Clicking the email link exchanges the code at `/auth/confirm` and lands on `/reset-password` with an active recovery session
- [ ] Submitting a new password (matching confirm, meeting length) updates the password and shows an inline success message + link to `/login`
- [ ] Mismatched/too-short password shows inline error, no submission
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
- [ ] Tests added under `tests/lib/auth/` and `tests/app/components/` for the new actions and forms
