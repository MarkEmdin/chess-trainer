# Spec: keyboard arrows in the example boards

Status: done
Branch: fix/line-demo-keys

## Problem

/tutorial and /about say to step through a line with the arrows. The example
boards have on-screen arrows only, so the keyboard arrows do nothing, although
they work on the real board.

## Goal

After a click inside an example board, the left and right keyboard arrows step
through its line, within the same bounds as the on-screen arrows.

## Non-goals

Home, End, ArrowUp and ArrowDown: those keys keep scrolling the page. Arrow keys
without a click first: a page holds several demos.

## Acceptance criteria

- [x] Keys step the demo that holds focus, and only that one
- [x] Keys keep working after an on-screen arrow disables itself
- [x] `npm test`, `npm run lint` and `npm run build` pass
