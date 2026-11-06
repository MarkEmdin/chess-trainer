# Spec: What the site can do

Status: in-progress
Branch: feature/about-features

## Problem

The home page lists four features and `/about` lists none. Writing moves on the
board, the bot, the leaderboard and the feedback button are described nowhere.

## Goal

`/about` has a section that says what the site can do, including that moves
played on the board land in the text.

## Non-goals

- Drawing arrows and circles: left out of the section on purpose, because it
  does not work on a phone.
- Changes to the home page or the README.

## User-facing behavior

A "What you can do here" section after "Why this project", in both locales.
Key positions, moves on the board and questions each sit next to an example
board. In the moves and questions examples a chip opens its line at the first
move, as on the real site, and arrows step through it. The other features are
cards.

## Data & types

No data changes.

## UI

`app/[locale]/about/page.tsx`, `ExampleBoard`, `LineDemo`, and the example
moves in `app/constants/aboutExamples.ts`. `CHIP_CLASS` moves to `lib/coaching`,
so the page can use it without loading the Tiptap chip node.

## i18n

`about.features.title`, `about.features.items.<id>.{title,text}`, and
`about.features.demo.*` for the example texts.

## Acceptance criteria

- [x] The section lists key positions, games, questions, moves on the board,
      notifications, the leaderboard, learning materials and feedback.
- [x] Arrows are not mentioned.
- [x] The example boards render on a phone and a desktop width.
- [x] `npm run lint`, `npm test`, `npm run build` pass.
