import { holdSelection } from '@/lib/coaching/holdSelection';

function selectText() {
  document.body.innerHTML = '<p>text</p>';
  const range = document.createRange();
  range.selectNodeContents(document.body.firstChild!);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

describe('holdSelection', () => {
  it('keeps the range while held', () => {
    const selection = selectText();
    const release = holdSelection();
    selection.removeAllRanges();
    expect(selection.rangeCount).toBe(1);
    release();
  });

  it('allows clearing after release, and a second release is safe', () => {
    const selection = selectText();
    const release = holdSelection();
    release();
    release();
    selection.removeAllRanges();
    expect(selection.rangeCount).toBe(0);
  });
});
