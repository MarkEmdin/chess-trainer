# Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google sign-in, email-only login, and a nickname the user types and can change.

**Architecture:** Supabase handles Google through the PKCE flow and the existing `/auth/confirm` route. A trigger gives OAuth users a placeholder nickname with `nickname_set = false`, and a `set_nickname` RPC is the only writer of the nickname.

**Tech Stack:** Next.js 16, Supabase Auth, next-intl, Jest + RTL.

**Spec:** `specs/031-google-auth.md`

## Global Constraints

- Nickname format everywhere: `^[a-zA-Z0-9_-]{3,30}$`.
- Placeholder: `'player_' || left(replace(new.id::text, '-', ''), 12)`.
- `messages/{en,ru}.json` keep the same key tree. No new dependencies.
- Internal links and redirects use `@/i18n/navigation`. Only the redirect to Google uses `next/navigation`.
- Never read the Google name into a nickname.

## Review Focus

- Two people pick one nickname at once: `23505` must show `nicknameTaken`, not a raw error.
- Changing only the case of your own nickname (`mark` to `Mark`) must succeed.
- A password-reset link keeps going to its `next` and never reads the profile.
- A Google sign-in from `/ru` must store `ru` for a new user and land on `/ru`.
- Email typed with capitals or spaces at login must still sign in.

---

### Task 1: Migration

**Files:**
- Create: `supabase/migrations/20261107130000_google_auth.sql`
- Modify: `supabase/config.toml` (add `[auth.external.google]`, `enabled = false`, `client_id = ""`, `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`)

**Interfaces:**
- Produces: column `user_profiles.nickname_set`; RPC `set_nickname(p_nickname text) returns void`, errcode `22023` for a bad format, `28000` with no caller, `23505` on a clash.

- [ ] Write the migration per the spec. `grant execute` on `set_nickname` to `authenticated` only, `revoke all ... from public, anon`. No grant on `nickname_set`.
- [ ] If Docker is available, run `npx supabase db reset` and check in SQL: a row with `provider: google` gets the placeholder, `set_nickname` handles a case-only change of the caller's own name, and `update user_profiles set nickname_set = true` as `authenticated` is denied. Without Docker, report that this waits for prod.
- [ ] Commit.

### Task 2: Nickname actions

**Files:**
- Create: `lib/auth/nickname.ts` (`NICKNAME_RE`)
- Modify: `lib/auth/actions.ts` (import `NICKNAME_RE`), `lib/auth/profileActions.ts`, `lib/auth/getUser.ts`
- Test: `tests/lib/auth/profileActions.test.ts`

**Interfaces:**
- Produces: `updateNickname(prev: ProfileFormState, formData: FormData): Promise<ProfileFormState>`; `chooseNickname(prev, formData)`, same signature, redirects to `/` on success; `AuthedUser.nicknameSet: boolean`. Field name `nickname`.

- [ ] Write failing tests: bad format returns `auth.errors.nicknameFormat` with no RPC call; `{code:'23505'}` returns `auth.errors.nicknameTaken`; success calls `rpc('set_nickname', {p_nickname})` with the trimmed value and revalidates `/[locale]` as `layout`; `chooseNickname` redirects on success, returns the error otherwise. `getUser` treats a missing `nickname_set` as `true`.
- [ ] Run: `npx jest tests/lib/auth`. Expected: FAIL.
- [ ] Implement, with one unexported `saveNickname` helper behind both actions.
- [ ] Run: `npx jest tests/lib/auth`. Expected: PASS.
- [ ] Commit.

### Task 3: Email login and reset

**Files:**
- Modify: `lib/auth/actions.ts`, `app/components/AuthForm/index.tsx`, `app/components/ForgotPasswordForm/index.tsx`, `messages/{en,ru}.json`
- Test: `tests/lib/auth/actions.test.ts`, `tests/app/components/AuthForm/index.test.tsx`, `tests/app/components/ForgotPasswordForm/index.test.tsx`

**Interfaces:**
- Produces: `signIn` reads field `email`; `requestPasswordReset` reads field `email`.

- [ ] Rewrite tests: `signIn` calls `signInWithPassword` with the trimmed lowercase email and no RPC; `invalid_credentials` returns `auth.errors.invalidCredentials`; `requestPasswordReset` never calls the admin RPC. The login form shows an email field, the register form still shows a nickname field.
- [ ] Run the three test files. Expected: FAIL.
- [ ] Implement. Remove `lookupEmail`, `noAccount`, `wrongPassword`, `registerSuggest` and the `register` suggest type.
- [ ] Run the three test files. Expected: PASS.
- [ ] Commit.

### Task 4: Google button and callback

**Files:**
- Create: `app/components/GoogleButton/index.tsx`
- Modify: `lib/auth/actions.ts`, `app/components/AuthForm/index.tsx`, `app/[locale]/auth/confirm/route.ts`, `app/[locale]/login/page.tsx`, `messages/{en,ru}.json`
- Test: `tests/lib/auth/actions.test.ts`, `tests/app/components/GoogleButton/index.test.tsx`, `tests/app/auth/confirm/`

**Interfaces:**
- Produces: `signInWithGoogle(): Promise<void>`, a form action.

- [ ] Write failing tests. Action: `signInWithOAuth` gets `provider: 'google'` and `redirectTo: 'https://example.com/en/auth/confirm'`, then `next/navigation` `redirect` gets `data.url`; on error, redirect to `/login?error=google_failed`. Route: `?error=access_denied` goes to `/en/login?error=google_failed`; `code` with `next` goes to `next` and reads no profile; `code` with `nickname_set: false` goes to `/en/choose-nickname`; `code` with `preferred_locale: 'ru'` and no `next` goes to `/ru`; a null `preferred_locale` is updated to the route locale. Button: shows `auth.google`.
- [ ] Run the files. Expected: FAIL.
- [ ] Implement. The button uses `useFormStatus` for the pending state. Login page maps `error=google_failed` to `t('googleFailed')`. Add `auth.google`, `auth.or`, `auth.errors.googleFailed`.
- [ ] Run the files. Expected: PASS.
- [ ] Commit.

### Task 5: Choose-nickname screen and strip

**Files:**
- Create: `app/[locale]/choose-nickname/page.tsx`, `app/components/ChooseNicknameForm/index.tsx`, `app/components/NicknameStrip/index.tsx`
- Modify: `app/components/Header/index.tsx`, `messages/{en,ru}.json`
- Test: `tests/app/components/ChooseNicknameForm/index.test.tsx`, `tests/app/components/NicknameStrip/index.test.tsx`, `tests/app/components/Header/index.test.tsx`

**Interfaces:**
- Consumes: `chooseNickname`, `AuthedUser.nicknameSet`.

- [ ] Write failing tests: form submits `nickname` and shows the returned error; strip links to `/choose-nickname` and renders nothing on that path; Header renders the strip only when `nicknameSet` is false.
- [ ] Run the files. Expected: FAIL.
- [ ] Implement. The strip is a client component using `usePathname` from `@/i18n/navigation`. Page: guest to `/login`, `nicknameSet` to `/`.
- [ ] Run the files. Expected: PASS.
- [ ] Commit.

### Task 6: Nickname in the profile

**Files:**
- Create: `app/components/NicknameForm/index.tsx`
- Modify: `app/[locale]/profile/page.tsx`, `messages/{en,ru}.json`
- Test: `tests/app/components/NicknameForm/index.test.tsx`

**Interfaces:**
- Consumes: `updateNickname`.

- [ ] Write failing tests: field shows the current nickname, submits it, shows the saved message and the error.
- [ ] Run the file. Expected: FAIL.
- [ ] Implement as a separate form above `ProfileForm`.
- [ ] Run the file. Expected: PASS.
- [ ] Commit.

### Task 7: Final checks

**Files:**
- Modify: `specs/031-google-auth.md` (`Status: in-progress`)

- [ ] Confirm by grep that nothing joins or keys on `nickname`, so a rename leaves answers, likes and Telegram links alone.
- [ ] Run `npm test`, `npm run lint`, `npm run build`. Expected: all pass.
- [ ] Commit.
- [ ] Hand over: the user applies the migration and sets up Google before merge. Google acceptance items are checked on prod after merge, then the spec becomes `done`.
