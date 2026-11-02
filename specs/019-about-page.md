# Spec: About page + footer

Status: in-progress
Branch: feature/about-page

## Problem

The site never says who made it, why, or how to reach the author. There is no
footer, so there is nowhere to put such a link.

## Goal

A `/about` page that explains the project, introduces the author and gives a
contact email and the GitHub repository. A thin footer on every page links to it.

## Non-goals

- No FIDE rating, country, tournaments, photo or birth year (user's call).
- No contact form.
- No new tab in the mobile bottom bar (it stays at three).

## User-facing behavior

`/ru/about` and `/en/about`, top to bottom:

1. **Why this project** — heading + two paragraphs.
2. **Author** — Mark Emdin, one short paragraph.
3. **Contact** — `chesstrainer.notify@gmail.com` as a `mailto:` link.
4. **Source code** — link to `https://github.com/MarkEmdin/chess-trainer`, opens in a new tab.

Footer (every page, under the content): `© <year> Chess Fundamentals · About`.

## UI

- `app/[locale]/about/page.tsx` — Server Component, `generateMetadata` for the title.
- `app/components/Footer/index.tsx` — Server Component, rendered in `app/[locale]/layout.tsx` after `children`.
- Contact constants in `lib/site.ts` (`CONTACT_EMAIL`, `REPO_URL`).

## i18n

- `about.metaTitle`, `about.title`
- `about.why.title`, `about.why.p1`, `about.why.p2`
- `about.author.title`, `about.author.text`
- `about.contact.title`, `about.contact.text`
- `about.source.title`, `about.source.text`, `about.source.link`
- `footer.about`

## Acceptance criteria

- [ ] `/about` shows the four sections in order, in both locales
- [ ] Email is a `mailto:` link, GitHub opens in a new tab with `rel="noopener noreferrer"`
- [ ] Footer with an About link is on every page
- [ ] `npm run lint`, `npm test`, `npm run build` pass
