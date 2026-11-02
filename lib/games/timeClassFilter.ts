import type { Game, TimeClass } from './types';

// Time controls the user can toggle. Daily is deliberately absent: those
// games are never shown, since long thinks mean nothing there (spec 018).
export const FILTER_TIME_CLASSES = ['bullet', 'blitz', 'rapid'] as const;
export type FilterTimeClass = (typeof FILTER_TIME_CLASSES)[number];

export function filterByTimeClass(
  games: Game[],
  selected: readonly FilterTimeClass[],
): Game[] {
  const keep = new Set<TimeClass>(selected);
  return games.filter((game) => keep.has(game.timeClass));
}
