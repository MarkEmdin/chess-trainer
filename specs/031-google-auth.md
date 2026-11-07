# Spec: Google sign-in, email login, editable nickname

Status: done
Branch: feature/google-auth

## Problem

Sign-up takes a form and a confirmation email, which is friction for the friends
about to test the app. Login uses a nickname, so the public name is also a
credential and can't be changed. A Google sign-up would fail outright:
`user_profiles.nickname` is `not null` and `handle_new_user` reads it from
metadata that Google doesn't send.

## Goal

- Login and register pages offer "Continue with Google" next to email + password.
- A new Google user enters a nickname on one screen right after Google.
- Login and password reset work by email only. Nickname login is gone.
- Any user can change their nickname in `/profile`.
- Existing accounts keep their nickname, data and password.

## Non-goals

- Other providers, magic links, avatars from Google.
- Importing the Google name into the nickname: the leaderboard is public, so a
  real name must never appear there without the user typing it.
- A cooldown or history for nickname changes.
- Unlinking Google, or a "connect Google" button in `/profile`.
- A custom Auth domain. Google's consent screen shows the `*.supabase.co` host.

## User-facing behavior

**New Google user.** Clicks the button on `/login` or `/register`, picks an
account at Google, lands on `/choose-nickname`, enters a nickname, goes to `/`.

**Leaves that screen without choosing.** They stay signed in with a placeholder
`player_<12 hex>`. Every page shows a thin strip "Choose your nickname" linking
to `/choose-nickname`, and the next Google sign-in opens the screen again.

**Returning Google user.** Goes straight to `/`, in their `preferred_locale`.

**Existing account, same confirmed email, first Google sign-in.** Supabase links
the identity to the same user. Same nickname, no nickname screen, password still
works.

**Existing account, unconfirmed email.** Supabase drops the unconfirmed identity
and links Google to that user. They keep the nickname. Rely on this rather than
adding code; check it once in acceptance.

**Cancelled at Google, or Google fails.** Back on `/login` with "Google sign-in
didn't complete. Try again." The current `link_expired` notice is wrong here.

**Email login.** `/login` asks for email + password. One error for wrong email
or wrong password ("Wrong email or password"); it no longer reveals whether an
account exists, so the `suggest: 'register'` branch goes.

**Email registration.** Unchanged: email, nickname, password, confirmation.

**Password reset.** Email only. A Google-only user can use it to add a password.

**Nickname change.** `/profile` gets a nickname field with its own save button,
same format rule as registration, "already taken" on a clash. The old nickname
is free at once.

## Data & types

Migration `supabase/migrations/20261107130000_google_auth.sql`:

- `user_profiles.nickname_set boolean not null default true`. Every existing row
  is correct by default.
- `handle_new_user`: when `raw_app_meta_data->>'provider'` is `email`, behave as
  today. Otherwise insert `'player_' || left(replace(new.id::text, '-', ''), 12)`
  with `nickname_set = false`.
- `set_nickname(p_nickname text)`, security definer, callable by `authenticated`
  only: validates `^[a-zA-Z0-9_-]{3,30}$`, updates the caller's row, sets
  `nickname_set = true`. A taken name surfaces as `unique_violation` and the
  action maps it to `nicknameTaken`. Use an RPC, not a column grant, because
  `nickname_set` must stay server-owned and the format must hold for direct calls.
- `lookup_email_by_nickname` stays: `signUp` still uses it for the taken check.

Rollout order: migration → enable Google in Supabase → merge. Each step is safe
alone: the trigger and the column are compatible with the current code, and the
button only appears with the merge.

Code:

- `lib/auth/actions.ts`: `signIn` takes email and drops the lookup and the admin
  client. `requestPasswordReset` takes email only and `lookupEmail` goes. New
  `signInWithGoogle` calls `signInWithOAuth` on the server client with
  `redirectTo: ${origin}/${locale}/auth/confirm`, then redirects to `data.url`.
- `lib/auth/profileActions.ts`: new `updateNickname` and a shared nickname check.
  It revalidates the layout so the header and account menu update.
- `lib/auth/getUser.ts`: `AuthedUser` gains `nicknameSet`.
- `app/[locale]/auth/confirm/route.ts`: reuse its existing `code` branch. After
  the exchange, when no `next` was passed, read the profile: `nickname_set` false
  goes to `/choose-nickname`; a null `preferred_locale` is filled from the route
  locale, because OAuth can't pass metadata; otherwise redirect to `/` in the
  stored locale. An `error` param goes to `/login?error=google_failed`.
- `supabase/config.toml`: add `[auth.external.google]`, disabled, secret from env.

## UI

- `app/[locale]/choose-nickname/page.tsx`, server component: redirects guests to
  `/login` and users with `nicknameSet` to `/`.
- `app/components/ChooseNicknameForm/index.tsx`, client (`useActionState`).
- `app/components/GoogleButton/index.tsx`: a form posting to `signInWithGoogle`,
  with the multicolour G mark per Google's branding rules and the pending state.
- `app/components/AuthForm`: Google button on top, an "or" divider, then the form.
  Login shows an email field instead of nickname.
- `app/components/ForgotPasswordForm`: one email field, `name="email"`.
- `app/components/ProfileForm`: nickname field, separate form and save button.
- `Header`: renders the strip when `user.nicknameSet` is false, hidden on
  `/choose-nickname` itself via the client-side pathname if needed.

## i18n

Under `auth`: `google`, `or`, `errors.invalidCredentials`, `errors.googleFailed`,
`chooseNickname.title`, `.subtitle`, `.submit`, `.pending`, `.strip`.
Under `profile`: `nickname`, `nicknameSave`, `nicknameSaved`.
Change `auth.forgotPassword.subtitle` and `.identifier` to email only.
Remove `auth.errors.noAccount`, `wrongPassword` and `registerSuggest` if nothing
else uses them. Google's button text: "Continue with Google" / "Войти через Google".

## Setup by the user

1. Google Auth Platform: External app named Chess Fundamentals, Web client,
   redirect URI copied from the Supabase Google provider page, JavaScript origin
   of the production site, scopes `openid`, email, profile.
2. Publish the app to production. In Testing mode only listed test users can sign
   in. Basic scopes need no Google review.
3. Paste client ID and secret into Supabase, enable the provider.
4. Check that the redirect allow list covers `/{locale}/auth/confirm`. Password
   reset already uses that URL, so it should.

## Acceptance criteria

- [ ] New Google user reaches `/choose-nickname` and then `/` with that nickname
- [ ] Leaving the screen shows the strip; next Google sign-in reopens the screen
- [ ] Google sign-in on a confirmed email account opens that account, no screen
- [ ] Cancelling at Google shows the translated notice
- [ ] Email login works; nickname in that field fails with the shared error
- [ ] Password reset by email works
- [ ] Nickname change shows in the header, leaderboard, coach queue and Telegram
      notifications; old questions, answers and likes stay with the user
- [ ] A taken or badly formatted nickname is refused by UI and by direct RPC call
- [ ] A client can't write `nickname_set` directly
- [ ] `npm test`, `npm run lint` with zero warnings, `npm run build` pass
- [ ] Tests added under `tests/` for the actions, route, forms and strip
