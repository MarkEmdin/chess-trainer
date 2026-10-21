# Spec: Landing page

Status: in-progress
Branch: feature/landing-page

## Problem

The home page is a single centered block: brand, a one-line subtitle about "pieces, moves, and core strategies", one dense paragraph, and a "Start Learning" button that goes to `/lessons`. It undersells the real idea of the project (thinking through key positions yourself, without an engine) and doesn't show what the site can do or how the pieces fit together.

## Goal

A visitor landing on `/` understands in under a minute:

1. **The idea** — help beginner players analyze positions on their own, without computer help; learn to put their ideas into words; discuss them with a coach (now) and with other players (later).
2. **How it works** — connect your Chess.com / Lichess games → the site finds positions where you thought for a long time → you write down your own analysis and send it to a coach.
3. **What's available** — Key Positions, Games, Coaching, Learning materials — each with a link.
4. **What's coming** — discussing positions with other players.

The primary call to action leads to Key Positions (`/think-time`), the core feature. A secondary one leads to learning materials (`/lessons`).

## Non-goals

- No new features, routes or data — the page only describes and links to what exists.
- No screenshots, illustrations or animations.
- No change to the header/nav, metadata OG image or other pages.
- "Discuss with other players" is announced only, not built.

## User-facing behavior

Top to bottom, one page, works at phone width:

1. **Hero** — ♔, "Chess Fundamentals" (literal brand), a tagline, the idea paragraph, two buttons: primary "Find my key positions" → `/think-time`, secondary "Learning materials" → `/lessons`.
2. **How it works** — three numbered steps (find → think → discuss).
3. **What you can do here** — four cards, each a link:
   - Key Positions → `/think-time`
   - Games → `/games`
   - Coaching → `/coaching` (logged-out visitors get the existing login redirect)
   - Learning materials → `/lessons` (description notes they're Russian-only)
4. **Coming soon** — one muted block: discuss your analysis with other players.

Copy in both locales (en/ru), see i18n below.

## Data & types

None. Card/step lists are local `as const` arrays in the page, like `app/[locale]/lessons/page.tsx`.

## UI

- Rewrite `app/[locale]/page.tsx`. Server Component (no hooks, no browser APIs).
- Reuse `Card` from `@/app/components/ui/card` and `buttonVariants` from `@/app/components/ui/button`; `Link` from `@/i18n/navigation`.
- Semantic tokens only (`bg-background`, `text-muted-foreground`, `bg-card`, …) so all three themes work.
- Single page file, no new component folder — nothing here is reused elsewhere.

## i18n

Replace the `home` namespace in both `messages/en.json` and `messages/ru.json` (old keys `subtitle`, `description`, `startLearning` are used only by the home page and are removed):

```
home.tagline
home.idea
home.ctaPrimary
home.ctaSecondary
home.howItWorks.title
home.howItWorks.find.title / .text
home.howItWorks.think.title / .text
home.howItWorks.discuss.title / .text
home.features.title
home.features.keyPositions.title / .description
home.features.games.title / .description
home.features.coaching.title / .description
home.features.lessons.title / .description
home.future.title
home.future.description
```

Also update `metadata.description` (both locales) to match the new pitch.

## Acceptance criteria

- [ ] `/en` and `/ru` show hero, how-it-works, four feature cards, coming-soon block
- [ ] Primary CTA links to `/think-time`, secondary to `/lessons`; cards link to `/think-time`, `/games`, `/coaching`, `/lessons`
- [ ] Layout has no horizontal scroll at 375px width; looks right in light, dark, rose
- [ ] `messages/en.json` and `messages/ru.json` have identical key trees (test enforces it)
- [ ] Tests under `tests/app/page.test.tsx` and `tests/messages.test.ts`
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm test` passes
- [ ] `npm run build` passes
