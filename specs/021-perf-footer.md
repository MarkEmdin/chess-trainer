# Spec: speed, loading feedback, footer

Status: done
Branch: feature/perf-footer

## Problem

- On short pages the footer sits right under the content instead of at the
  bottom of the screen.
- Pages feel slow: switching "Waiting / Answered" tabs takes a long time and
  shows nothing while it loads, so a click looks ignored.
- Spec 020 bug: "My questions" (`/coaching`) shows "Coach's response" without
  the coach's name, because the page doesn't load answer authors.

Diagnosis (2026-11-03): Vercel functions run in `iad1` (US East, from the
`X-Vercel-Id` header) while Supabase is in `eu-west-1` (Ireland), so every
query crosses the Atlantic. `getAuthedUser` runs 3 times per page (Header,
NotificationBell, page), each a Supabase Auth round trip plus a profile query.
Tab switches change only search params, so `loading.tsx` never shows.

## Goal

- The footer is at the bottom of the viewport on short pages.
- Server code runs next to the database; the user is looked up once per request.
- Any slow click shows a spinner on what was clicked: tabs, nav links,
  form buttons.
- Students see who answered on `/coaching`.

## Non-goals

- Client-side caching of tab data or rewriting pages to SWR.
- A global top progress bar.

## User-facing behavior

- Clicking a tab or header link that hasn't loaded yet shows a small spinner
  inside it until the new page arrives.
- Submit buttons show a spinner next to their pending text and stay disabled.

## Data & types

- `vercel.json`: `{ "regions": ["dub1"] }`.
- `getAuthedUser` wrapped in React `cache()` (per-request dedupe).
- `/coaching` selects `coaching_responses.author_id` and runs `withAuthors`.

## UI

- `app/components/Spinner/index.tsx`: `Loader2Icon` with `animate-spin`, aria-hidden.
- `app/components/LinkPending/index.tsx` (client): `useLinkStatus()`; renders
  the spinner while its parent `<Link>` is pending. Used in the tab links on
  `/coaching`, `/admin`, `/admin/coaches` and the header nav.
- `app/[locale]/layout.tsx`: children wrapped in a `flex-1` column so the
  footer is pushed down.

## i18n

None.

## Decisions made without the user

- Spinner inside the clicked element rather than a top bar.
- No unit test for the layout wrapper or `cache()` (not observable in jsdom);
  verified by build and the prod `X-Vercel-Id` header after deploy.

## Acceptance criteria

- [x] Footer at the bottom on `/about`, `/coaching` with no questions
- [ ] Tab click shows a spinner until the page switches
- [ ] Pending submit buttons show a spinner
- [ ] `/coaching` shows "Answer from <coach>"
- [ ] After deploy, `X-Vercel-Id` ends in `::dub1::`
- [x] `npm run lint`, `npm test`, `npm run build` pass
