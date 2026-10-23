import {
  chipLabel,
  contentToPlainText,
  drawKey,
  parseContent,
  type MessageContent,
} from '@/lib/coaching/content';

// Italian game, black to move.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const LINE = ['d6', 'c3', 'Nf6'];

const valid: MessageContent = {
  v: 1,
  segments: [
    { t: 'text', text: 'Хотел ' },
    { t: 'moves', line: 'l1', from: 0, to: 1 },
    { t: 'text', text: ' а потом ' },
    { t: 'moves', line: 'l1', from: 1, to: 3 },
    { t: 'text', text: '?' },
  ],
  lines: { l1: LINE },
  drawings: {
    key: { arrows: [['e5', 'f4']], circles: [] },
    'l1:2': { arrows: [], circles: ['e4'] },
  },
};

const json = (value: unknown) => JSON.stringify(value);
const withChange = (change: Partial<MessageContent>) =>
  json({ ...valid, ...change });

describe('drawKey', () => {
  it('names the key position "key"', () => {
    expect(drawKey(null, 0)).toBe('key');
    expect(drawKey('l1', 0)).toBe('key');
  });

  it('names a line position by line and ply', () => {
    expect(drawKey('l1', 2)).toBe('l1:2');
  });
});

describe('chipLabel', () => {
  it('numbers the first move of a chip that starts mid-line', () => {
    expect(chipLabel(FEN, LINE, 1, 3)).toBe('4. c3 Nf6');
  });

  it('numbers a black first move and later white moves', () => {
    expect(chipLabel(FEN, LINE, 0, 2)).toBe('3… d6 4. c3');
  });

  it('numbers a lone black move with an ellipsis', () => {
    expect(chipLabel(FEN, LINE, 2, 3)).toBe('4… Nf6');
  });
});

describe('contentToPlainText', () => {
  it('writes chips inline as notation', () => {
    expect(contentToPlainText(FEN, valid)).toBe(
      'Хотел 3… d6 а потом 4. c3 Nf6?',
    );
  });
});

describe('parseContent', () => {
  it('returns null when the field is absent or empty', () => {
    expect(parseContent(null, FEN)).toBeNull();
    expect(parseContent('', FEN)).toBeNull();
  });

  it('rejects text that is not JSON', () => {
    expect(parseContent('not json', FEN)).toBe('invalid');
  });

  it('accepts valid content unchanged', () => {
    expect(parseContent(json(valid), FEN)).toEqual(valid);
  });

  it('drops unknown keys', () => {
    const raw = json({
      ...valid,
      extra: true,
      segments: [{ t: 'text', text: 'hi', bold: true }],
    });
    expect(parseContent(raw, FEN)).toEqual({
      ...valid,
      segments: [{ t: 'text', text: 'hi' }],
    });
  });

  it.each<[string, string]>([
    ['an unknown version', withChange({ v: 2 as 1 })],
    ['an illegal move', withChange({ lines: { l1: ['d6', 'Ke5'] } })],
    [
      'a line over 40 moves',
      withChange({
        lines: { l1: Array.from({ length: 41 }, () => 'Nf6') },
      }),
    ],
    [
      'more than 10 lines',
      withChange({
        lines: Object.fromEntries(
          Array.from({ length: 11 }, (_, i) => [`l${i}`, ['d6']]),
        ),
        segments: [],
        drawings: {},
      }),
    ],
    [
      'more than 30 move chips',
      withChange({
        segments: Array.from({ length: 31 }, () => ({
          t: 'moves' as const,
          line: 'l1',
          from: 0,
          to: 1,
        })),
      }),
    ],
    [
      'a chip on a missing line',
      withChange({ segments: [{ t: 'moves', line: 'x', from: 0, to: 1 }] }),
    ],
    [
      'an empty chip range',
      withChange({ segments: [{ t: 'moves', line: 'l1', from: 1, to: 1 }] }),
    ],
    [
      'a chip past the line end',
      withChange({ segments: [{ t: 'moves', line: 'l1', from: 0, to: 4 }] }),
    ],
    [
      'a drawing past the line end',
      withChange({ drawings: { 'l1:9': { arrows: [], circles: ['e4'] } } }),
    ],
    [
      'a bad square',
      withChange({ drawings: { key: { arrows: [], circles: ['z9'] } } }),
    ],
    [
      'more than 20 arrows on one position',
      withChange({
        drawings: {
          key: {
            arrows: Array.from({ length: 21 }, () => ['e2', 'e4']),
            circles: [],
          },
        },
      }),
    ],
  ])('rejects %s', (_label, raw) => {
    expect(parseContent(raw, FEN)).toBe('invalid');
  });
});
