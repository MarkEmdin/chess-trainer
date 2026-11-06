# Spec: Clear promise and a working way in

Status: in-progress
Branch: feature/tutorial

## Problem

New visitors take the site for a set of chess exercises and do not sign up. This
is the owner's observation; there is no analytics. The first screen talks about
learning on your own, a human coach appears only at the end of a grey paragraph,
and nothing shows a real answer. A guest who gets as far as a position meets a
plain "Sign in" sentence with no link, and registering loses their nickname and
position.

## Goal

The first screen says that a real coach answers, and shows what an answer looks
like. A guest who wants to ask gets a one-tap way to sign up and comes back to
their nickname and position.

## Non-goals

- Writing a question before signing up.
- A nickname field on the landing.
- Prices. Nothing states whether answers are free until the owner decides.
- Renaming "Learn" in the navigation.

## User-facing behavior

### Landing

The headline promises a real coach, with one main button to `/think-time`. Next
to it, a sample question and answer that can be stepped through on a board,
labelled as a sample. "Learning materials" is no longer a button on the first
screen, only a card lower down. Link previews use the same promise.

### Guest on a position

A real "Ask coach" button leads to `/register`, with a short note that an account
is needed. The position is remembered in this browser.

### After signing up

- Email confirmed: the button leads to `/think-time`, not `/lessons`.
- A signed-in user with no saved nickname takes the one this browser remembers,
  so they don't enter it again. It is saved to the profile and removed from the
  browser. A nickname already in the profile is never replaced.
- `/think-time` selects the remembered position once, and opens it on a phone.
  If it isn't in the loaded games, the list simply shows as usual.
- In another browser, nothing is remembered and the normal form appears.

## Data & types

No migration. `lib/coaching/pendingAsk.ts`: one localStorage key, tolerates
storage being off.

## UI

- `app/[locale]/page.tsx`, `app/[locale]/email-confirmed/page.tsx`.
- `LongThinks`, `PositionDetail`, `GamesShell`.

## i18n

New `home.headline`, `home.subhead`, `home.demoLabel`,
`thinkTime.detail.accountNeeded`. Removed `home.tagline`, `home.idea`,
`home.ctaSecondary`, `thinkTime.detail.signInToAsk`. Changed `home.ctaPrimary`,
`metadata.description`, `auth.register.subtitle`, `auth.emailConfirmed.cta`.

## Decisions made without the user (check these)

- The landing sample reuses the invented Berlin question from `/about`, labelled
  as a sample. It can be replaced by a real answer.
- The guest returns to the position, not straight into the writing window.
- The link preview text changes too, since it carries the same promise.

## Acceptance criteria

- [x] The first screen names a real coach, has one main button and a sample.
- [x] A guest on a position has an "Ask coach" link to `/register`.
- [x] After signing up, the remembered nickname is used and saved; a profile
      nickname is never replaced.
- [x] `/think-time` selects the remembered position once.
- [x] Email confirmed leads to `/think-time`.
- [x] Storage being off breaks nothing.
- [x] `npm run lint`, `npm test`, `npm run build` pass.
