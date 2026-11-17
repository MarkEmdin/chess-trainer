import {
  contentToPlainText,
  type MessageContent,
} from '@/lib/coaching/content';
import {
  composeGuidedContent,
  type GuidedLabels,
} from '@/lib/coaching/guidedQuestion';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3';

const REASON_LABELS = {
  noPlan: "Couldn't see a plan",
  threat: 'Worried about a threat',
  calculation: "Couldn't calculate it",
  choice: "Couldn't choose between moves",
} as const;

const labels: GuidedLabels = {
  candidates: 'Candidates:',
  reasons: 'Held me back:',
  question: 'Question:',
  reason: (r) => REASON_LABELS[r],
};

const empty: MessageContent = { v: 1, segments: [], lines: {}, drawings: {} };

describe('composeGuidedContent', () => {
  it('joins all three steps, one line each', () => {
    const candidates: MessageContent = {
      v: 1,
      segments: [
        { t: 'text', text: 'Maybe ' },
        { t: 'moves', line: 'l1', from: 0, to: 1 },
      ],
      lines: { l1: ['Nf6'] },
      drawings: { key: { arrows: [['g8', 'f6']], circles: [] } },
    };
    const result = composeGuidedContent(
      {
        candidates,
        reasons: ['calculation', 'noPlan'],
        question: '  why not e5?  ',
      },
      labels,
    );
    expect(result.segments).toEqual([
      { t: 'text', text: 'Candidates: ' },
      { t: 'text', text: 'Maybe ' },
      { t: 'moves', line: 'l1', from: 0, to: 1 },
      {
        t: 'text',
        text: "\nHeld me back: couldn't see a plan, couldn't calculate it",
      },
      { t: 'text', text: '\nQuestion: why not e5?' },
    ]);
    expect(result.lines).toEqual(candidates.lines);
    expect(result.drawings).toEqual(candidates.drawings);
  });

  it('leaves out empty steps', () => {
    const result = composeGuidedContent(
      { candidates: empty, reasons: [], question: 'x' },
      labels,
    );
    expect(result.segments).toEqual([{ t: 'text', text: 'Question: x' }]);
  });

  it('treats whitespace-only step 1 as empty', () => {
    const result = composeGuidedContent(
      {
        candidates: { ...empty, segments: [{ t: 'text', text: '  \n ' }] },
        reasons: ['threat'],
        question: '',
      },
      labels,
    );
    expect(contentToPlainText(FEN, result)).toBe(
      'Held me back: worried about a threat',
    );
  });

  it('returns no segments when every step is empty', () => {
    const result = composeGuidedContent(
      { candidates: empty, reasons: [], question: '   ' },
      labels,
    );
    expect(result.segments).toEqual([]);
  });
});
