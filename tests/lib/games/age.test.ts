import { isOldGame } from '@/lib/games/age';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-10T12:00:00Z');

describe('isOldGame', () => {
  it('is false for a game played today', () => {
    expect(isOldGame(new Date(now.getTime() - 60_000), now)).toBe(false);
  });

  it('is false at exactly seven days', () => {
    expect(isOldGame(new Date(now.getTime() - 7 * DAY), now)).toBe(false);
  });

  it('is true just past seven days', () => {
    expect(isOldGame(new Date(now.getTime() - 7 * DAY - 1), now)).toBe(true);
  });
});
