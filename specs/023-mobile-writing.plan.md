# Mobile writing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make writing a question or answer on a phone usable: no duplicated text, moves at the caret, working tap-tap, a board that stays visible.

**Architecture:** Editor and board fixes are small and local; the layout uses a pinned board column and one media-query hook that moves the game list below the form under `lg`.

**Tech Stack:** Next.js 16, Tiptap 3, react-chessboard 5, Tailwind v4, Jest + RTL, Playwright (scratch only, not added to the repo).

**Spec:** `specs/023-mobile-writing.md`

## Global Constraints

- Desktop (`lg` and up) layout is unchanged.
- No data or i18n changes. No new dependencies.
- Do not run repo-wide prettier.

## Review Focus

1. A tap on a piece: the library's drop on the same square must not clear the selection the tap just made.
2. Closing the modal while recording: the selection override must be removed.
3. A capture by tap: follow-up mouse events must not take focus from the text.
4. A tap on an empty square must complete a move.
5. Undo and "back to key" on touch must not open the keyboard.

---

### Task 1: Backspace during composition

**Files:** Create `app/components/CoachingModal/composingKeymap.ts`; Modify `MoveEditor.tsx`; Test `tests/app/components/CoachingModal/composingKeymap.test.ts`.

**Produces:** `ComposingKeymap` extension; `MoveEditor` uses `enableCoreExtensions: { keymap: false }`.

- [ ] Test: while `view.composing`, the Backspace handler returns false and the doc is unchanged; when not composing, Backspace and Enter still edit.
- [ ] Implement by extending `extensions.Keymap` from `@tiptap/core`.
- [ ] Commit.

### Task 2: Caret survives a touch on the board

**Files:** Create `lib/coaching/holdSelection.ts`; Modify `CoachingModal/index.tsx`, `MoveEditor.tsx`; Test `tests/lib/coaching/holdSelection.test.ts`, `MoveEditor.test.tsx`.

**Produces:** `holdSelection(): () => void`, which shadows `removeAllRanges` on the document selection until the returned release runs. The dragged piece's `removeAllRanges()` is the only thing moving the caret, so blocking it keeps the recorder chain too.

- [ ] Test: while held, `removeAllRanges` keeps the range; after release it clears; release twice is safe.
- [ ] Hold while recording on a touch screen, in an effect keyed on `recording`. A hold per touch fails: the touch end may not arrive, and the selection still clears after the drop.
- [ ] Test and implement: `focus()` in `MoveEditor` does nothing under `(pointer: coarse)`.
- [ ] Commit.

### Task 3: Tap-tap on pieces

**Files:** Modify `ChessboardWithNotation/index.tsx`, `VariationBoard.tsx`; Test the matching files.

- [ ] Test: with `allowDragging` and `onSquareClick`, a touch that starts and ends on a square, moving under 10px, calls `onSquareClick` once with that square; a longer touch move doesn't; without `allowDragging` it doesn't.
- [ ] Implement with touch capture handlers on the board wrapper, using `closest('[data-square]')`, for every square, and `preventDefault` on a tap.
- [ ] Test and implement: `Writer` ignores a drop on the source square, keeping `selected`.
- [ ] Commit.

### Task 4: Layout

**Files:** Create `lib/useIsWide.ts`; Modify `app/[locale]/layout.tsx`, `CoachingModal/index.tsx`, `VariationBoard.tsx`; Test `CoachingModal.test.tsx`, `VariationBoard.test.tsx`.

**Produces:** `useIsWide(): boolean` (`min-width: 64rem`, true without `matchMedia`); exported `GameMoves({ game, boardIndex, onChange })`; `VariationBoard` prop `showGameMoves`.

- [ ] Test: with a narrow `matchMedia`, the game list follows the form in the DOM; with a wide one it stays in the board column.
- [ ] Implement. Under `lg` the board column is `sticky top-0 z-10 bg-popover` with `max-w-[min(100%,calc(100dvh-240px))]`.
- [ ] Tapping a game move under `lg` leaves variation viewing.
- [ ] Hide "clear drawings" with `pointer-coarse:hidden`.
- [ ] Add `viewport.interactiveWidget = 'resizes-content'`.
- [ ] Commit.

### Task 5: Verify

- [ ] Rerun the emulation scripts against the branch: composition, caret order, tap-tap, drag, layout at 393×760 and 393×460, desktop.
- [ ] `npm run lint`, `npm test`, `npm run build`. Tick the spec.
