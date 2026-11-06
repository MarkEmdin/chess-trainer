# Spec: Hiding the board on a phone

Status: in-progress
Branch: feature/mobile-board-collapse

## Problem

After spec 023 the board stays pinned in `CoachingModal` on a phone. The user
tried it: it is better, but the board then covers everything and cannot be
dismissed. The dialog's close button scrolls away with the content, a swipe
that starts on a piece does not scroll, and without the keyboard the pinned
block takes half of the window while writing and about two thirds while
viewing. When the keyboard closes the board grows and pushes the send button
out of view.

## Goal

On a phone the user can always close the window, hide the board without losing
what they are writing, read the question and answers without the board on top,
and reach the send button while writing.

## Non-goals

- Changes to the desktop layout (`lg` and up).
- Scrolling by swiping on a piece.
- Any change to what is saved.

## User-facing behavior

Everything below applies under the `lg` breakpoint, in `CoachingModal`, for
student and coach.

### Top bar

- A thin bar stays pinned to the top of the window in every state. It holds
  "Hide board" / "Show board" on the left and the close cross on the right.
- It replaces the dialog's own cross, which is not rendered under `lg`.
- Tapping the bar does not stop recording and does not close the keyboard.

### Hiding the board

- "Hide board" removes the whole board block. "Show board" brings it back.
- Hiding keeps the text, the chips, the recording state, the position on the
  board and the step inside a viewed line.
- While hidden, typing does not bring the board back.
- Tapping a chip in a message or a game move brings the board back, because
  those taps have nothing to show otherwise.

### When the board is pinned

- Pinned: while recording, while viewing a line, and once the user has used
  the game navigation.
- Otherwise the board scrolls away with the text.

### Caret

- While recording the caret stays between the board (or the bar, when the board
  is hidden) and the send row: while typing, while deleting, when the board gets
  pinned, resized, hidden or shown, and when the keyboard opens.

### Opening

- The window opens at its top. The game move list no longer scrolls the whole
  window down to itself on open.

### Send button

- The row with the send button stays pinned to the bottom of the window while
  the form is on screen.

## Data & types

No data changes.

## UI

- `CoachingModal/index.tsx`: top bar, `boardHidden` state, conditional `sticky`
  on the board column, sticky send row. `DialogContent` turns from grid into
  block under `lg`, because a sticky grid item cannot leave its own row.
- `MoveEditor`: `visibleArea` prop and `revealCaret()`, because ProseMirror only
  knows the edges of the scrolling box, not what is pinned inside it.
- `GameMoveList`: scrolls its own box instead of `scrollIntoView`.
- `lib/coaching/scrollDelta.ts`: the shared calculation for both.

## i18n

New keys, in both locales:

- `coaching.boardBar.hide`: Hide board / Скрыть доску
- `coaching.boardBar.show`: Show board / Показать доску
- `coaching.boardBar.close`: Close / Закрыть

## Risks

- With the keyboard open the bar and the send row take height from the text.
  The board's size cap gets retuned so that at least two lines of text fit.
- A board that was `display: none` must get its size back when shown again.

## Decisions made without the user (check these)

- Reverses spec 023's "pinned in every state", which that spec listed as a
  decision made without the user.
- The board stays pinned while viewing a line and after using the game
  navigation. The approved proposal said the board scrolls away while reading;
  if it also did so here, a tap on a chip or game move would change a board
  that is off screen.
- Hiding is not remembered between openings of the window.
- The caret and opening fixes were not in the approved proposal. Emulation
  showed both as defects of pinning the board, so they are included here.

## Acceptance criteria

- [x] Under `lg`, the close cross stays on screen at any scroll position.
- [x] Hiding the board keeps recording, the text and the board position.
- [x] A chip tap or a game move tap brings a hidden board back.
- [x] The board is pinned while recording and viewing, not while reading.
- [x] The send button is visible while writing, with the keyboard open or closed.
- [x] With the keyboard open at least two lines of text are visible.
- [x] On `lg` and up the dialog is unchanged.
- [x] The caret stays visible while typing and deleting, in emulation.
- [ ] Manual check on the Xiaomi from a Vercel preview.
- [x] `npm run lint`, `npm test`, `npm run build` pass.
