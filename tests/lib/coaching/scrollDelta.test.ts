import { scrollDelta } from '@/lib/coaching/scrollDelta';

const area = { top: 300, bottom: 400 };

describe('scrollDelta', () => {
  it('leaves a visible caret alone', () => {
    expect(scrollDelta({ top: 320, bottom: 348 }, area)).toBe(0);
  });

  it('scrolls down when the caret is under the send row', () => {
    expect(scrollDelta({ top: 390, bottom: 418 }, area)).toBe(18);
  });

  it('scrolls up when the caret is under the board', () => {
    expect(scrollDelta({ top: 280, bottom: 308 }, area)).toBe(-20);
  });
});
