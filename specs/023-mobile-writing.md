# Spec: Writing a question or answer on a phone

Status: in-progress
Branch: feature/mobile-writing

## Problem

A coach trying to answer from a Xiaomi phone found it almost impossible to
write a variation, and students use the same window. The board scrolls away
while typing, the game moves sit between the board and the text, and deleting
text can duplicate it. Emulating an Android phone (393×760) on 2026-11-05
reproduced four defects:

- Shrinking a word while the keyboard composes it duplicates text: `привет`
  shortened to `при` gave `привепри`. Tiptap's core keymap handles the
  Backspace that ProseMirror synthesizes during composition. Bare ProseMirror
  and Tiptap without that extension are fine.
- After touch-dragging a piece, the chip lands at the start of the text, not at
  the caret: `Смотри ` became `11. dxe5 Смотри `. The caret position goes to 1
  through a DOM change when the drag starts; dnd-kit, inside react-chessboard,
  calls `removeAllRanges()` at that moment and touch leaves the editor focused.
  With a mouse the chip lands correctly.
- Tap-tap doesn't move on touch when the first tap is on a piece: nothing is
  selected. react-chessboard's touch sensor starts a drag at touch start, which
  cancels its own tap detection.
- On a 760px screen the board ends at 522px and the editor starts at 874px.

## Goal

On a phone a student or coach can type, play moves on the board and delete text
without losing the board, the caret or their text. Moves land where the caret
is, and tap-tap and drag both work.

## Non-goals

- Drawing arrows or circles on touch.
- Changes to the desktop layout (`lg` and up).
- Replacing Tiptap with a plain textarea.
- Offline drafts or any change to what is saved.

## User-facing behavior

Everything below applies under the `lg` breakpoint, unless noted, in
`CoachingModal` for both student and coach.

### Layout

- Order: board, question, answers, editor with its buttons, send button, then
  game navigation and the game move list.
- The board stays pinned to the top of the window while the content scrolls, in
  every state of the window: browsing, writing and viewing a variation.
- The dialog title scrolls away; only the board stays.
- With the keyboard open the board shrinks to about 200px so that 2–3 lines of
  text fit below it. It grows back when the keyboard closes.

### Moves and the caret

- A chip lands at the caret as it was before the piece was touched.
- Drag and tap-tap both record a move. Tap-tap works for a first tap on a piece
  and a second tap on an empty square or a capture. Tapping another own piece
  selects that piece.
- Playing a move doesn't open the keyboard. If it is open, it stays open. The
  keyboard opens only when the user taps the text.
- With the keyboard closed, a move still lands at the last caret position.
- Tapping a game move leaves writing and shows that position, as a click outside
  the form does today. The text is kept.

### Deleting text

- Backspace during composition deletes only what was deleted. Text never
  reappears, and a chip is never eaten by a word being shortened.
- Backspace, Enter and joining paragraphs work as before when not composing.

## Data & types

No data changes.

## UI

- `CoachingModal/index.tsx`: the board column becomes `sticky top-0` under `lg`,
  above the scrolling content, with its size capped by `dvh` so it follows the
  keyboard. Target: `min(100%, calc(100dvh - 240px))`, tuned on the device.
- `app/[locale]/layout.tsx`: `viewport.interactiveWidget = 'resizes-content'`
  so Android Chrome shrinks `dvh` with the keyboard. It applies to the whole
  site, so check that no other page breaks.
- `VariationBoard`: game navigation and `GameMoveList` render below the form
  under `lg`, and where they are today on `lg` and up.
- `MoveEditor`: wrap the core keymap so Backspace returns false while
  `view.composing`, and turn the core one off with
  `enableCoreExtensions: { keymap: false }`. Tried in a scratch build:
  composition, plain Backspace and Enter all behaved.
- `CoachingModal`: while recording on touch, block `removeAllRanges` so the
  drag library can't reset the caret. `MoveEditor`: skip `focus()` on touch.
- `ChessboardWithNotation`: detect a tap on touch and call `onSquareClick`,
  since the library misses them, for empty squares too.

## i18n

No new keys.

## Risks

- iOS Safari ignores `interactive-widget`, so `dvh` won't follow its keyboard.
  The layout must stay usable there, even if the board doesn't shrink.
- Pieces set `touch-action: none`, so a swipe starting on a piece doesn't
  scroll. A pinned board makes this easier to hit; the window scrolls from the
  text.
- Emulation drives composition through browser commands, not a real keyboard.
  The Xiaomi keyboard is confirmed only on the phone.

## Decisions made without the user (check these)

- The board stays pinned in every state, not only while writing.
- Game navigation moves with the move list, to keep the pinned block small.
- The dialog title scrolls away.

## Acceptance criteria

- [x] Shrinking a composing word leaves the shortened word, with and without a
      chip before it.
- [x] Plain Backspace, Enter and paragraph join still work.
- [x] After text, a touch-dragged move lands at the caret; text typed after it
      and a second move stay in order.
- [x] Tap-tap records a quiet move and a capture on touch.
- [x] A move doesn't focus the editor on touch; on desktop it still does.
- [x] Under `lg`, the order is board, question, answers, editor, game moves.
- [x] The board stays visible while typing at 393×460 in emulation.
- [x] On `lg` and up the layout is unchanged.
- [ ] Manual check on the Xiaomi from a Vercel preview: delete, caret, tap-tap,
      board visible with the keyboard open.
- [x] `npm run lint`, `npm test`, `npm run build` pass.
- [x] Tests under `tests/` for the keymap, caret and tap logic.
