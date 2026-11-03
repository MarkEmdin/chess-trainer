import type { Role } from '@/lib/auth/roles';

// TS mirror of SQL `can_see_request` (spec 020), for service-role code that
// bypasses RLS (Telegram). `coachOf` maps student id → their coach's id.
export function canSeeRequest(
  viewer: { id: string; role: Role },
  askerId: string,
  coachOf: ReadonlyMap<string, string>,
): boolean {
  if (viewer.id === askerId || viewer.role === 'admin') return true;
  if (viewer.role !== 'coach') return false;
  const coach = coachOf.get(askerId);
  return coach === undefined || coach === viewer.id;
}
