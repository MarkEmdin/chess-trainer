import { formatMoveLabel } from '@/lib/chess/replay';
import { MAX_VARIATION_MOVES, playVariation } from '@/lib/chess/variation';

// A message written in the inline editor: text with move chips, the lines
// those chips come from, and arrows/circles drawn on their positions. Every
// line starts at the thread's key position (spec 011).

export type Drawing = { arrows: [string, string][]; circles: string[] };

// Half-moves [from, to) of `line`, shown at this spot in the text.
export type MoveSegment = {
  t: 'moves';
  line: string;
  from: number;
  to: number;
};
export type Segment = { t: 'text'; text: string } | MoveSegment;

export type MessageContent = {
  v: 1;
  segments: Segment[];
  lines: Record<string, string[]>;
  // Keyed by `drawKey`.
  drawings: Record<string, Drawing>;
};

export const MAX_LINES = 10;
export const MAX_CHIPS = 30;
// Per drawing key, for arrows and circles separately.
export const MAX_MARKS = 20;

const SQUARE = /^[a-h][1-8]$/;

export function drawKey(line: string | null, ply: number): string {
  return line === null || ply === 0 ? 'key' : `${line}:${ply}`;
}

// The first move always carries its number, so a chip that continues a line
// after some text still reads on its own: "4. c3 Nf6", "4… Nf6".
export function chipLabel(
  fen: string,
  moves: string[],
  from: number,
  to: number,
): string {
  const played = playVariation(fen, moves.slice(0, to));
  if (!played) return '';
  return played.moves
    .slice(from)
    .map((m, i) =>
      i === 0 || m.color === 'white' ? formatMoveLabel(m) : m.san,
    )
    .join(' ');
}

// What previews, the admin list and the length limit see.
export function contentToPlainText(
  fen: string,
  content: MessageContent,
): string {
  return content.segments
    .map((s) =>
      s.t === 'text'
        ? s.text
        : chipLabel(fen, content.lines[s.line], s.from, s.to),
    )
    .join('');
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function readSegment(
  raw: unknown,
  lines: Record<string, string[]>,
): Segment | null {
  if (!isObject(raw)) return null;
  if (raw.t === 'text') {
    return typeof raw.text === 'string' ? { t: 'text', text: raw.text } : null;
  }
  if (raw.t !== 'moves' || typeof raw.line !== 'string') return null;
  const { from, to } = raw;
  const line = lines[raw.line];
  if (
    !line ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    (from as number) < 0 ||
    (from as number) >= (to as number) ||
    (to as number) > line.length
  ) {
    return null;
  }
  return { t: 'moves', line: raw.line, from: from as number, to: to as number };
}

function readDrawing(raw: unknown): Drawing | null {
  if (!isObject(raw)) return null;
  const { arrows, circles } = raw;
  if (!Array.isArray(arrows) || !Array.isArray(circles)) return null;
  if (arrows.length > MAX_MARKS || circles.length > MAX_MARKS) return null;
  const isSquare = (s: unknown): s is string =>
    typeof s === 'string' && SQUARE.test(s);
  if (!circles.every(isSquare)) return null;
  if (
    !arrows.every(
      (a) =>
        Array.isArray(a) && a.length === 2 && isSquare(a[0]) && isSquare(a[1]),
    )
  ) {
    return null;
  }
  return {
    arrows: arrows.map((a) => [a[0], a[1]] as [string, string]),
    circles: [...circles],
  };
}

// The `content` form field. Null when absent; 'invalid' for anything that
// isn't a well-formed, legal message. The result is rebuilt field by field,
// so nothing the client added beyond the format reaches the database.
export function parseContent(
  raw: FormDataEntryValue | null,
  fen: string,
): MessageContent | null | 'invalid' {
  if (raw === null || raw === '') return null;
  if (typeof raw !== 'string') return 'invalid';
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return 'invalid';
  }
  if (!isObject(value) || value.v !== 1) return 'invalid';
  if (!isObject(value.lines) || !Array.isArray(value.segments)) {
    return 'invalid';
  }
  if (!isObject(value.drawings)) return 'invalid';

  const lineEntries = Object.entries(value.lines);
  if (lineEntries.length > MAX_LINES) return 'invalid';
  const lines: Record<string, string[]> = {};
  for (const [id, moves] of lineEntries) {
    if (
      !Array.isArray(moves) ||
      moves.length === 0 ||
      moves.length > MAX_VARIATION_MOVES ||
      !moves.every((m) => typeof m === 'string') ||
      !playVariation(fen, moves)
    ) {
      return 'invalid';
    }
    lines[id] = [...moves];
  }

  const segments: Segment[] = [];
  for (const raw of value.segments) {
    const segment = readSegment(raw, lines);
    if (!segment) return 'invalid';
    segments.push(segment);
  }
  if (segments.filter((s) => s.t === 'moves').length > MAX_CHIPS) {
    return 'invalid';
  }

  const drawings: Record<string, Drawing> = {};
  for (const [key, raw] of Object.entries(value.drawings)) {
    if (key !== 'key') {
      const [line, ply] = key.split(':');
      const moves = lines[line];
      const n = Number(ply);
      if (!moves || !Number.isInteger(n) || n < 1 || n > moves.length) {
        return 'invalid';
      }
    }
    const drawing = readDrawing(raw);
    if (!drawing) return 'invalid';
    drawings[key] = drawing;
  }

  return { v: 1, segments, lines, drawings };
}
