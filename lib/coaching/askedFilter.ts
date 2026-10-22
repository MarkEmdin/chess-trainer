import type { ThreadStatus } from './status';

export type AskedFilter = 'all' | 'unasked' | 'asked';

export const ASKED_FILTERS: readonly AskedFilter[] = [
  'all',
  'unasked',
  'asked',
];

// "Asked" covers waiting and answered threads alike.
export function matchesAskedFilter(
  status: ThreadStatus,
  filter: AskedFilter,
): boolean {
  if (filter === 'all') return true;
  return filter === 'unasked' ? status === 'none' : status !== 'none';
}
