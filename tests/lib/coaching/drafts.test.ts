import {
  clearDraft,
  draftKey,
  DRAFT_TTL_MS,
  loadDraft,
  saveDraft,
} from '@/lib/coaching/drafts';
import {
  initialRecorder,
  type RecorderState,
} from '@/lib/coaching/moveRecorder';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3';
const KEY = 'coaching-draft:reply:r1';
const NOW = 1_800_000_000_000;

const recorder: RecorderState = {
  ...initialRecorder(FEN),
  lines: { l1: ['Nf6'] },
  chips: { c1: { line: 'l1', from: 0, to: 1 } },
  cursor: { line: 'l1', ply: 1 },
  active: 'c1',
  typed: false,
  nextId: 2,
};

const doc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Play ' },
        { type: 'moveChip', attrs: { id: 'c1', label: '3… Nf6' } },
        { type: 'moveChip', attrs: { id: 'ghost', label: '1. e4' } },
      ],
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('draftKey', () => {
  it('keys a question by game and move', () => {
    expect(
      draftKey({ kind: 'ask', gameUrl: 'https://x/g/1', moveIndex: 14 }),
    ).toBe('coaching-draft:ask:https://x/g/1:14');
  });

  it('keys a response by request', () => {
    expect(draftKey({ kind: 'reply', requestId: 'r1' })).toBe(KEY);
  });
});

describe('loadDraft / saveDraft', () => {
  it('round-trips the text and the moves behind its chips', () => {
    saveDraft(KEY, { doc, recorder }, NOW);
    const draft = loadDraft(KEY, FEN, NOW + 1000);
    expect(draft?.savedAt).toBe(NOW);
    expect(draft?.recorder.lines).toEqual({ l1: ['Nf6'] });
    expect(draft?.recorder.chips).toEqual(recorder.chips);
  });

  it('puts the board back on the key position', () => {
    saveDraft(KEY, { doc, recorder }, NOW);
    const r = loadDraft(KEY, FEN, NOW)!.recorder;
    expect(r.cursor).toEqual({ line: null, ply: 0 });
    expect(r.active).toBeNull();
    expect(r.typed).toBe(true);
    expect(r.nextId).toBe(2);
  });

  it('drops chips whose moves the recorder does not know', () => {
    saveDraft(KEY, { doc, recorder }, NOW);
    const ids = loadDraft(KEY, FEN, NOW)!
      .doc.content![0].content!.filter((n) => n.type === 'moveChip')
      .map((n) => n.attrs!.id);
    expect(ids).toEqual(['c1']);
  });

  it.each([
    [
      'expired',
      () => saveDraft(KEY, { doc, recorder }, NOW - DRAFT_TTL_MS - 1),
    ],
    ['not JSON', () => localStorage.setItem(KEY, '{oops')],
    [
      'not a doc',
      () =>
        localStorage.setItem(
          KEY,
          JSON.stringify({ savedAt: NOW, doc: { type: 'x' }, recorder }),
        ),
    ],
    [
      'missing lines',
      () =>
        localStorage.setItem(
          KEY,
          JSON.stringify({
            savedAt: NOW,
            doc,
            recorder: { ...recorder, lines: null },
          }),
        ),
    ],
    [
      'for another position',
      () =>
        saveDraft(KEY, { doc, recorder: { ...recorder, fen: 'other' } }, NOW),
    ],
  ])('ignores and deletes a draft that is %s', (_label, seed) => {
    seed();
    expect(loadDraft(KEY, FEN, NOW)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('returns null when there is no draft', () => {
    expect(loadDraft(KEY, FEN, NOW)).toBeNull();
  });

  it('clears a draft', () => {
    saveDraft(KEY, { doc, recorder }, NOW);
    clearDraft(KEY);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('survives storage that throws', () => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      jest.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new Error('blocked');
      });
    }
    expect(() => saveDraft(KEY, { doc, recorder }, NOW)).not.toThrow();
    expect(loadDraft(KEY, FEN, NOW)).toBeNull();
    expect(() => clearDraft(KEY)).not.toThrow();
  });
});
