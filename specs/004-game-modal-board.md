# Spec: Readable game modal board

Status: done
Branch: feature/game-modal-board

## Problem

The game modal (`app/components/ChessComGames/GameModal.tsx`, opened from `/games` tiles and
`/think-time` cards) is hard to read:

- The board is capped at 480 px even on large monitors; coordinate labels are `text-xs`.
- Whose turn it is shows only as a faint background tint on a player row.
- Which player has white/black shows only as a 12 px circle that is `aria-hidden` (invisible to screen readers).
- No indication on the board of which move was just played.

And it has bugs:

1. **Crash on games that don't start from the standard position** (Lichess "from position",
   Chess.com/Lichess Chess960 with a `[FEN]` header). `buildReplay` replays history from the standard
   start, `chess.js` throws `Invalid move`, the whole route falls into the error boundary. Reproduced.
2. In such games, if black moves first, the "last move took X" duration is attributed to the wrong side
   (`moverIsWhite = index % 2 === 1` assumes white moved first).
3. `Home` / `End` also scroll the dialog (no `preventDefault`).

## Goal

- The board is as large as the screen allows: up to 720 px on desktop, full dialog width on phones,
  never taller than the viewport minus the modal's other controls.
- At every position it's obvious, in text, who is to move and who plays white/black.
- The last move's from/to squares are highlighted on the board.
- No crash for any PGN; custom-start games replay correctly.
- Looks good at 375 px and 320 px width, and on a short landscape phone screen (no content cut off;
  the dialog scrolls if needed).

## Non-goals

- Move list / clickable notation, flip-board button, arrows, engine evaluation — deferred.
- Support for non-standard rules (Chess960 castling, crazyhouse, etc.) beyond not crashing.
- Changing the tile/card boards outside the modal.

## User-facing behavior

### Board

- Board wrapper width: `min(100%, 720px, 100dvh − <height of header + player rows + controls>)`.
  Builder picks the exact subtraction (≈ 260 px) so the whole modal fits a 1366×768 laptop without scrolling.
- Dialog widens on `sm+` to fit the larger board (`sm:max-w-3xl` or equivalent); on mobile it keeps the
  default `calc(100% − 2rem)` width with the board filling it.
- Dialog gets `max-h-[calc(100dvh-2rem)] overflow-y-auto` so short screens scroll instead of clipping.
- Coordinate labels (`ChessboardWithNotation`) grow from `text-xs` to `text-sm`.

### Players and turn

Each player row (top = opponent, bottom = user, unchanged orientation) becomes:

```
[swatch] username (rating)                     01:23
         White · To move
```

- Swatch grows to 16 px (keeps `bg-white` / `bg-black` + border; raw colors are fine — they *are* the piece colors).
- Second line, `text-xs text-muted-foreground`: color label "White"/"Белые" or "Black"/"Чёрные", plus
  " · To move" / " · Ходит" on the side to move. This text is not `aria-hidden`.
- The side to move also gets a strong visual marker: `border-l-4 border-primary` + existing tint.
  The other row keeps a transparent left border of the same width so names don't shift.
- Clock stays on the right, bumps to `text-base` for readability.
- At the final position the side "to move" is whoever would move next (e.g. the mated side) — no special case.

### Last move highlight

- When `index > 0`, the from and to squares of `moves[index − 1]` get a translucent yellow background
  (`rgba(255, 213, 79, 0.5)` — chess-convention color, intentionally not a theme token).
- Start position: no highlight.

### Bugs

1. Replay positions come from `chess.js` verbose history's own `before` / `after` FENs, so custom starts
   replay correctly. Move numbers come from the `before` FEN's full-move field (black-first games show `1… e5`).
   If `loadPgn` throws (e.g. unsupported Chess960 castling), the modal shows `game.finalFen` as a single
   position with navigation disabled — never the standard start position.
2. Last-move duration uses the mover's actual color (`moves[index − 1].color`), not index parity.
3. Handled keys (`ArrowLeft`, `ArrowRight`, `Home`, `End`) call `preventDefault()`.

## Future compatibility

A later release will let users play their own moves in the modal and record them as a variation.
This spec doesn't build that, but avoids blocking it:

- Replay lives in a pure module (`lib/chess/replay.ts`) that derives every position from FENs, so a
  variation tree can branch off any position later without re-parsing the mainline.
- `ReplayMove` carries `from`/`to`, which the same last-move highlight can reuse for variation moves.
- Navigation stays index-based for now; the variations release will replace it with tree-node navigation.
- `ChessboardWithNotation` keeps `allowDragging: false`; no drop handler is added yet.

## Data & types

- `ReplayMove` gains `from: string; to: string` (squares) and computes `fullMoveNumber` from FEN.
- `buildReplay(pgn, fallbackFen)` — moved to `lib/chess/replay.ts` so it's unit-testable without rendering
  the modal. Returns `{ positions: string[]; moves: ReplayMove[] }`.
- No API, hook, or server changes.

## UI

- `app/components/ChessComGames/GameModal.tsx` — uses `lib/chess/replay.ts`, new `PlayerRow` layout,
  `squareStyles` for last move, sizing classes, `preventDefault`.
- `app/components/ChessboardWithNotation/index.tsx` — label size only.
- Both already `'use client'`.

## i18n

New keys under `games.modal` (both locales):

```
games.modal.white   // "White"   / "Белые"
games.modal.black   // "Black"   / "Чёрные"
games.modal.toMove  // "To move" / "Ходит"
```

## Acceptance criteria

- [ ] A PGN with `[SetUp "1"] [FEN "…"]` replays without throwing; positions[0] equals that FEN
- [ ] A PGN `loadPgn` rejects yields `positions = [fallbackFen]`, `moves = []`, nav buttons disabled
- [ ] Black-first game: first move labelled `N… san`; duration attributed to black
- [ ] Each player row shows its color label; exactly one row shows "To move", and it flips as you step moves
- [ ] Last move's from/to squares passed to the board as highlighted; none at start position
- [ ] `Home`/`End`/arrows call `preventDefault`
- [ ] Board up to 720 px on desktop, modal fits 1366×768 without scroll; at 375/320 px board fills width, no horizontal overflow; short landscape (e.g. 740×360) scrolls inside the dialog without clipping
- [ ] `npm test` green (new: `tests/lib/chess/replay.test.ts`, `tests/app/components/ChessComGames/GameModal.test.tsx`), `npm run lint` zero warnings, `npm run build` passes
