# Spec: footer always visible on desktop

Status: done
Branch: feature/sticky-footer

## Problem

On long pages (for example `/about`, 3196px on a 945px screen) the footer sits
after all the content, so on desktop it is out of sight until the user scrolls
to the very end. Short pages are already fine (spec 021).

## Goal

From the `lg` breakpoint up, the footer is at the bottom of the screen on every
page, at any scroll position.

## Non-goals

- Phones and tablets: below `lg` the bottom tab bar is pinned there; the footer
  stays at the end of the content.
- The footer's contents.

## User-facing behavior

The footer stays on screen while the page scrolls and comes to rest after the
content, so it never covers the end of a page. Modals still open above it.

## UI

`app/components/Footer/index.tsx`: `lg:sticky lg:bottom-0 lg:z-30`. Sticky
rather than fixed, so the body needs no reserved space. `z-30` is below the
dialogs and sheets (`z-50`).

## i18n

No new keys.

## Acceptance criteria

- [x] `/about` at 1440px: the footer is visible at the top of the page
- [x] `/about` scrolled to the end: the last content is not covered
- [x] Short pages: the footer is at the bottom of the screen
- [x] An open modal covers the footer
- [x] Below `lg`: the footer is at the end of the content, as before
- [x] `npm run lint` passes with zero warnings
- [x] `npm run build` passes
- [x] Tests updated under `tests/app/components/Footer`
