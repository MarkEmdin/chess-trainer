import { cupFor } from '@/lib/leaderboard/rows';

describe('cupFor', () => {
  it('maps places 1-3 to cups and the rest to null', () => {
    expect(cupFor(1)).toBe('gold');
    expect(cupFor(2)).toBe('silver');
    expect(cupFor(3)).toBe('bronze');
    expect(cupFor(4)).toBeNull();
  });
});
