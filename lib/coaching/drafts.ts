import type { JSONContent } from '@tiptap/core';
import type { RecorderState } from './moveRecorder';

// Unsent text in the coaching modal (spec 012), kept in this browser so an
// accidental close loses nothing. The recorder travels with the document:
// a chip is only a label, its moves live there.

export type Draft = {
  savedAt: number;
  doc: JSONContent;
  recorder: RecorderState;
};

export type DraftTarget =
  | { kind: 'ask'; gameUrl: string; moveIndex: number }
  | { kind: 'reply'; requestId: string };

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function draftKey(target: DraftTarget): string {
  return target.kind === 'ask'
    ? `coaching-draft:ask:${target.gameUrl}:${target.moveIndex}`
    : `coaching-draft:reply:${target.requestId}`;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isDraft(v: unknown): v is Draft {
  if (!isObject(v) || typeof v.savedAt !== 'number') return false;
  const { doc, recorder } = v;
  return (
    isObject(doc) &&
    doc.type === 'doc' &&
    isObject(recorder) &&
    typeof recorder.fen === 'string' &&
    isObject(recorder.lines) &&
    isObject(recorder.chips) &&
    isObject(recorder.drawings) &&
    typeof recorder.nextId === 'number'
  );
}

// Chips whose moves the recorder lost would show a line that isn't there.
function dropUnknownChips(node: JSONContent, chips: object): JSONContent {
  if (!node.content) return node;
  return {
    ...node,
    content: node.content
      .filter((n) => n.type !== 'moveChip' || Object.hasOwn(chips, n.attrs?.id))
      .map((n) => dropUnknownChips(n, chips)),
  };
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing was saved either.
  }
}

export function loadDraft(
  key: string,
  fen: string,
  now = Date.now(),
): Draft | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (
    !isDraft(parsed) ||
    parsed.recorder.fen !== fen ||
    now - parsed.savedAt > DRAFT_TTL_MS
  ) {
    clearDraft(key);
    return null;
  }

  const recorder: RecorderState = {
    ...parsed.recorder,
    cursor: { line: null, ply: 0 },
    active: null,
    typed: true,
  };
  return {
    savedAt: parsed.savedAt,
    doc: dropUnknownChips(parsed.doc, recorder.chips),
    recorder,
  };
}

export function saveDraft(
  key: string,
  draft: Omit<Draft, 'savedAt'>,
  now = Date.now(),
): void {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: now, ...draft }));
  } catch {
    // Private mode or full: the editor works without drafts.
  }
}
