# Spec: Tutorial

Status: in-progress
Branch: feature/tutorial

## Problem

Nothing explains how to write a question or an answer: that tapping the text
starts recording, that moves on the board land in the text, how to start another
line. `/about` only says that it exists. A new user is not pointed to any help.

## Goal

A separate page explains the site and how to fill in a question or an answer. A
first-time visitor is offered it, and it is one tap away from anywhere, including
from the writing window.

## Non-goals

- A step-by-step overlay on top of the real interface.
- Remembering the offer on the account. It is per browser.
- Drawing arrows and circles, which stay out of user-facing copy.

## User-facing behavior

### The page

`/tutorial`, public. Numbered steps for asking a question, with an example board
that can be stepped through, then phone tips, reading an answer, a note for
coaches, and a button to the positions.

### First visit

A strip under the header on every page offers the tutorial, with "Open tutorial"
and a cross. It goes away for good after either of them, or after reaching the
tutorial in any other way. It never appears on the tutorial itself. People who
already have accounts see it once too.

### Access

- A "Help" item in the main navigation, on desktop and in the phone tab bar.
- A link in the footer.
- A "How to fill this in?" link next to the text in the writing window. It opens
  a new tab, so the window and the text stay as they are.

## Data & types

No migration. `lib/tutorial/useTutorialSeen.ts`: localStorage flag read through
`useSyncExternalStore`. The server snapshot counts as seen, so returning visitors
never get a flash of the strip.

## UI

- `app/[locale]/tutorial/page.tsx`.
- `app/components/FirstVisitPrompt/index.tsx`, rendered from the layout.
- `SiteNav`, `Footer`, `CoachingModal`.

## i18n

New `tutorial.*` namespace, `nav.help`, `footer.tutorial`,
`coaching.editor.howToFill`.

## Decisions made without the user (check these)

- A strip, not a popup: it doesn't block a first look at the site.
- "Help" is a fifth item in the phone tab bar.
- The link from the writing window opens a new tab.
- The tab bar now applies below `lg` instead of `sm`: five items overflowed the
  header from 640 to about 770 wide.

## Acceptance criteria

- [x] The tutorial is public and its button names match the site.
- [x] A first visit shows the strip; opening, closing or reaching the tutorial
      hides it for good.
- [x] The strip is not on the tutorial page and never flashes for a returning
      visitor.
- [x] Help is in both navigations, the footer links to it, and the writing window
      links to it in a new tab.
- [x] The tab bar and header fit at 393 and 640 wide.
- [x] `npm run lint`, `npm test`, `npm run build` pass.
