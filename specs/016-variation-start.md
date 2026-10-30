# Spec: open a variation at its start

Status: done
Branch: feature/variation-start

## Problem

When the coach reads a student's message, or the student reads the coach's answer, clicking a move chip in the text (e.g. "3… Nf6 4. Nc3 Bb4") opens the board at the chip's last move. To follow the idea the reader has to step back to the beginning first.

## Goal

Clicking a chip opens the board on the chip's first move: that move is played and highlighted, and → steps through the rest of the chip.

## Non-goals

- The legacy "View variation" button for pre-spec-011 messages: it already opens at the key position.
- Recording, drawing, or how chips are written.

## User-facing behavior

- Chip covering half-moves `[from, to)` of its line opens at ply `from + 1`.
- Arrows/circles drawn at that ply show, as on any other ply.
- ← from there goes back one ply as before; → walks to the chip's end and beyond within the line.

## Acceptance criteria

- [x] Clicking a chip shows the position after the chip's first move
- [x] A chip that continues a line after text (from > 0) opens on its own first move, not the line's
- [x] `npm run lint`, `npm run build`, `npm test` pass
