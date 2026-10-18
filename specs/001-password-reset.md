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
4. User clicks the link in the email → lands on `/reset-password` with a Supabase recovery session
   already established from the URL token
5. Form asks for new password (+ confirm) → on submit, password is updated → redirect to `/login` with a
   success message

## Data & types

- No new DB tables. Reuses the existing `lookup_email_by_nickname` RPC (already used by `signIn`/`signUp`)
  to translate nickname → email server-side, same reasoning as the existing code (anon users have no
  SELECT on other profiles via RLS).
- `AuthFormState` type in `lib/auth/actions.ts` is reused for the new actions' return shape.

## Server actions (`lib/auth/actions.ts`)

- `requestPasswordReset(_prev, formData)`: reads `nickname`, looks up email via admin RPC, calls
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })`. Returns the
  same neutral success message regardless of whether the nickname matched (no `suggest` field — nothing
  to enumerate).
- `updatePassword(_prev, formData)`: reads `password` + `confirmPassword`, validates they match and meet
  Supabase's minimum length, calls `supabase.auth.updateUser({ password })` using the session already
  present from the recovery link, redirects to `/login` on success.

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
auth.resetPassword.success

auth.errors.passwordMismatch
auth.errors.passwordTooShort
```

## Supabase config (manual, no code)

- No SMTP setup for now (default built-in email sender — rate-limited but free; revisit if the project
  exceeds Supabase's default hourly email cap)
- Add `/reset-password` to the redirect URL allowlist in Supabase Dashboard → Auth → URL Configuration
  for every deployed origin (localhost + Vercel prod URL)

## Acceptance criteria

- [ ] "Forgot password?" link visible on `/login`
- [ ] Submitting a valid nickname shows neutral success message, triggers Supabase reset email
- [ ] Submitting an unknown nickname shows the same neutral success message (no enumeration)
- [ ] Clicking the email link lands on `/reset-password` with an active recovery session
- [ ] Submitting a new password (matching confirm, meeting length) updates the password and redirects to `/login`
- [ ] Mismatched/too-short password shows inline error, no submission
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` passes
- [ ] Tests added under `tests/lib/auth/` and `tests/app/components/` for the new actions and forms
