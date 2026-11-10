const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// A game finished more than a week ago — the player may not remember what
// they were thinking, so the UI suggests thinking about it now (spec 036).
export function isOldGame(endTime: Date, now: Date): boolean {
  return now.getTime() - endTime.getTime() > WEEK_MS;
}
