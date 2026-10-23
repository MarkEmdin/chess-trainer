import { Chess } from 'chess.js';
import { MAX_VARIATION_MOVES, playVariation } from '@/lib/chess/variation';
import {
  MAX_CHIPS,
  MAX_LINES,
  MAX_MARKS,
  chipLabel,
  drawKey,
  type Drawing,
  type MessageContent,
  type Segment,
} from './content';

// What the inline editor (spec 011) does with each board move, as pure
// functions so the rules can be tested without an editor or a board.
//
// A line is a sequence of moves from the key position. A chip is the part of
// a line shown at one spot in the text. A move extends the active chip when
// nothing was typed since the last move; otherwise it starts a new chip at
// the caret that continues the same line.

export type ChipRef = { line: string; from: number; to: number };

export type RecorderState = {
  fen: string;
  lines: Record<string, string[]>;
  chips: Record<string, ChipRef>;
  drawings: Record<string, Drawing>;
  // The board position: `ply` moves into `line`, or the key position.
  cursor: { line: string | null; ply: number };
  // The chip the next move may extend.
  active: string | null;
  // Text typed (or the caret moved) since the last move.
  typed: boolean;
  nextId: number;
};

// How the editor should change the text.
export type Edit =
  | { kind: 'insert'; id: string; label: string }
  | { kind: 'relabel'; id: string; label: string }
  | { kind: 'remove'; id: string }
  | null;

export type RecorderError =
  | 'illegal'
  | 'tooManyLines'
  | 'lineTooLong'
  | 'tooManyChips';

const EMPTY: Drawing = { arrows: [], circles: [] };

export function initialRecorder(fen: string): RecorderState {
  return {
    fen,
    lines: {},
    chips: {},
    drawings: {},
    cursor: { line: null, ply: 0 },
    active: null,
    typed: false,
    nextId: 1,
  };
}

function played(s: RecorderState) {
  const { line, ply } = s.cursor;
  return line ? playVariation(s.fen, s.lines[line].slice(0, ply)) : null;
}

export function boardFen(s: RecorderState): string {
  return played(s)?.positions.at(-1) ?? s.fen;
}

export function boardLastMove(
  s: RecorderState,
): { from: string; to: string } | null {
  const last = played(s)?.moves.at(-1);
  return last ? { from: last.from, to: last.to } : null;
}

export function currentDrawing(s: RecorderState): Drawing {
  return s.drawings[drawKey(s.cursor.line, s.cursor.ply)] ?? EMPTY;
}

export function recordMove(
  s: RecorderState,
  from: string,
  to: string,
): { state: RecorderState; edit: Edit } | { error: RecorderError } {
  let san: string;
  try {
    // Always promote to a queen: no picker UI (spec 005).
    san = new Chess(boardFen(s)).move({ from, to, promotion: 'q' }).san;
  } catch {
    return { error: 'illegal' };
  }

  const ply = s.cursor.line ? s.cursor.ply : 0;
  const old = s.cursor.line ? s.lines[s.cursor.line] : [];
  // Moving from the middle of a line starts a new line sharing its start, so
  // the chips already in the text keep their moves.
  const sameLine = s.cursor.line !== null && ply === old.length;
  let nextId = s.nextId;
  const line = sameLine ? s.cursor.line! : `l${nextId++}`;
  if (!sameLine && Object.keys(s.lines).length >= MAX_LINES) {
    return { error: 'tooManyLines' };
  }
  const moves = [...old.slice(0, ply), san];
  if (moves.length > MAX_VARIATION_MOVES) return { error: 'lineTooLong' };

  const lines = { ...s.lines, [line]: moves };
  const active = s.active ? s.chips[s.active] : null;
  const cursor = { line, ply: ply + 1 };

  if (active && active.line === line && active.to === ply && !s.typed) {
    const grown = { ...active, to: ply + 1 };
    return {
      state: {
        ...s,
        lines,
        chips: { ...s.chips, [s.active!]: grown },
        cursor,
        nextId,
      },
      edit: {
        kind: 'relabel',
        id: s.active!,
        label: chipLabel(s.fen, moves, grown.from, grown.to),
      },
    };
  }

  if (Object.keys(s.chips).length >= MAX_CHIPS) {
    return { error: 'tooManyChips' };
  }
  const id = `c${nextId++}`;
  const chip = { line, from: ply, to: ply + 1 };
  return {
    state: {
      ...s,
      lines,
      chips: { ...s.chips, [id]: chip },
      cursor,
      active: id,
      typed: false,
      nextId,
    },
    edit: {
      kind: 'insert',
      id,
      label: chipLabel(s.fen, moves, chip.from, chip.to),
    },
  };
}

export function backToKey(s: RecorderState): RecorderState {
  return { ...s, cursor: { line: null, ply: 0 }, active: null };
}

export function markTyped(s: RecorderState): RecorderState {
  return s.typed ? s : { ...s, typed: true };
}

export function activateChip(s: RecorderState, id: string): RecorderState {
  const chip = s.chips[id];
  if (!chip) return s;
  return {
    ...s,
    cursor: { line: chip.line, ply: chip.to },
    active: id,
    typed: false,
  };
}

// The editor reports which chips are still in the text; chips deleted there
// are forgotten here, along with lines nothing shows any more.
export function syncChips(
  s: RecorderState,
  presentIds: string[],
): RecorderState {
  const present = new Set(presentIds);
  const chips = Object.fromEntries(
    Object.entries(s.chips).filter(([id]) => present.has(id)),
  );
  const used = new Set(Object.values(chips).map((c) => c.line));
  if (s.cursor.line) used.add(s.cursor.line);
  const lines = Object.fromEntries(
    Object.entries(s.lines).filter(([id]) => used.has(id)),
  );
  const active = s.active && present.has(s.active) ? s.active : null;
  return { ...s, chips, lines, active };
}

// Only the tail of a line can be undone, from the chip that shows it.
export function canUndo(s: RecorderState): boolean {
  const chip = s.active ? s.chips[s.active] : null;
  return (
    !!chip &&
    s.cursor.line === chip.line &&
    s.cursor.ply === chip.to &&
    chip.to === s.lines[chip.line].length
  );
}

export function undoMove(s: RecorderState): {
  state: RecorderState;
  edit: Edit;
} {
  if (!canUndo(s)) return { state: s, edit: null };
  const id = s.active!;
  const chip = s.chips[id];
  const moves = s.lines[chip.line].slice(0, -1);
  const lines = { ...s.lines, [chip.line]: moves };
  if (moves.length === 0) delete lines[chip.line];
  const cursor =
    moves.length === 0
      ? { line: null, ply: 0 }
      : { line: chip.line, ply: chip.to - 1 };

  if (chip.to - 1 === chip.from) {
    const chips = { ...s.chips };
    delete chips[id];
    return {
      state: { ...s, lines, chips, cursor, active: null },
      edit: { kind: 'remove', id },
    };
  }
  const shrunk = { ...chip, to: chip.to - 1 };
  return {
    state: { ...s, lines, chips: { ...s.chips, [id]: shrunk }, cursor },
    edit: {
      kind: 'relabel',
      id,
      label: chipLabel(s.fen, moves, shrunk.from, shrunk.to),
    },
  };
}

// Right-click on one square toggles a circle; a right-drag toggles an arrow.
export function toggleMark(
  s: RecorderState,
  from: string,
  to: string,
): RecorderState {
  const key = drawKey(s.cursor.line, s.cursor.ply);
  const cur = s.drawings[key] ?? EMPTY;
  let next: Drawing;
  if (from === to) {
    const has = cur.circles.includes(from);
    if (!has && cur.circles.length >= MAX_MARKS) return s;
    next = {
      ...cur,
      circles: has
        ? cur.circles.filter((sq) => sq !== from)
        : [...cur.circles, from],
    };
  } else {
    const has = cur.arrows.some(([a, b]) => a === from && b === to);
    if (!has && cur.arrows.length >= MAX_MARKS) return s;
    next = {
      ...cur,
      arrows: has
        ? cur.arrows.filter(([a, b]) => !(a === from && b === to))
        : [...cur.arrows, [from, to]],
    };
  }
  return { ...s, drawings: { ...s.drawings, [key]: next } };
}

export function clearDrawings(s: RecorderState): RecorderState {
  const drawings = { ...s.drawings };
  delete drawings[drawKey(s.cursor.line, s.cursor.ply)];
  return { ...s, drawings };
}

// What gets saved: the editor's segments, the lines they show, and the
// drawings on the key position or on those lines.
export function recorderContent(
  s: RecorderState,
  segments: Segment[],
): MessageContent {
  const used = new Set(
    segments.flatMap((seg) => (seg.t === 'moves' ? [seg.line] : [])),
  );
  const lines = Object.fromEntries(
    Object.entries(s.lines).filter(([id]) => used.has(id)),
  );
  const drawings = Object.fromEntries(
    Object.entries(s.drawings).filter(([key, d]) => {
      if (d.arrows.length === 0 && d.circles.length === 0) return false;
      if (key === 'key') return true;
      const [line, ply] = key.split(':');
      return !!lines[line] && Number(ply) <= lines[line].length;
    }),
  );
  return { v: 1, segments, lines, drawings };
}
