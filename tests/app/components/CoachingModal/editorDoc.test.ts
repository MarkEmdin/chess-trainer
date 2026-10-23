import {
  chipIds,
  docToSegments,
} from '@/app/components/CoachingModal/editorDoc';

const chip = (id: string) => ({
  type: 'moveChip',
  attrs: { id, label: 'ignored' },
});
const text = (value: string) => ({ type: 'text', text: value });

const doc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [text('Хотел '), chip('c1'), text(' ')] },
    { type: 'paragraph', content: [chip('gone'), text('?')] },
    { type: 'paragraph' },
  ],
};

const chips = { c1: { line: 'l1', from: 0, to: 1 } };

describe('docToSegments', () => {
  it('turns paragraphs into text joined by line breaks, chips into moves', () => {
    expect(docToSegments(doc, chips)).toEqual([
      { t: 'text', text: 'Хотел ' },
      { t: 'moves', line: 'l1', from: 0, to: 1 },
      { t: 'text', text: ' \n?\n' },
    ]);
  });

  it('returns nothing for an empty doc', () => {
    expect(
      docToSegments({ type: 'doc', content: [{ type: 'paragraph' }] }, {}),
    ).toEqual([]);
  });
});

describe('chipIds', () => {
  it('lists chip ids in document order', () => {
    expect(chipIds(doc)).toEqual(['c1', 'gone']);
  });
});
