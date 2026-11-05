import { cupFor, splitRows } from '@/lib/leaderboard/rows';
import type { LeaderboardRow } from '@/lib/leaderboard/types';

const row = (place: number, is_me = false): LeaderboardRow => ({
  place,
  nickname: `n${place}`,
  likes: 1,
  is_me,
});

describe('cupFor', () => {
  it('maps places 1-3 to cups and the rest to null', () => {
    expect(cupFor(1)).toBe('gold');
    expect(cupFor(2)).toBe('silver');
    expect(cupFor(3)).toBe('bronze');
    expect(cupFor(4)).toBeNull();
  });
});

describe('splitRows', () => {
  it('pins own row beyond place 20', () => {
    const { top, pinned } = splitRows([row(1), row(21, true)]);
    expect(top.map((r) => r.place)).toEqual([1]);
    expect(pinned?.place).toBe(21);
  });

  it('keeps own row at place 20 in top', () => {
    const { top, pinned } = splitRows([row(1), row(20, true)]);
    expect(top).toHaveLength(2);
    expect(pinned).toBeNull();
  });

  it('keeps tied rows, including four at place 20', () => {
    const rows = [row(1), row(2), row(2), row(20), row(20), row(20), row(20)];
    const { top, pinned } = splitRows(rows);
    expect(top).toHaveLength(7);
    expect(pinned).toBeNull();
  });

  it('returns null pinned without own row', () => {
    expect(splitRows([row(1), row(2)]).pinned).toBeNull();
  });
});
