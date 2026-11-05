import type { Cup, LeaderboardRow } from './types';

const LIST_SIZE = 20;
const CUPS: Cup[] = ['gold', 'silver', 'bronze'];

export function cupFor(place: number): Cup | null {
  return CUPS[place - 1] ?? null;
}

// The RPC returns every place up to 20 (ties included) plus the caller's own
// row, which may be further down; that one is pinned below the list.
export function splitRows(rows: LeaderboardRow[]): {
  top: LeaderboardRow[];
  pinned: LeaderboardRow | null;
} {
  return {
    top: rows.filter((r) => r.place <= LIST_SIZE),
    pinned: rows.find((r) => r.is_me && r.place > LIST_SIZE) ?? null,
  };
}
