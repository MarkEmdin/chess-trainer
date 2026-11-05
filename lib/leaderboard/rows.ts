import type { Cup } from './types';

const CUPS: Cup[] = ['gold', 'silver', 'bronze'];

export function cupFor(place: number): Cup | null {
  return CUPS[place - 1] ?? null;
}
