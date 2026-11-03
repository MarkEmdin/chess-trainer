import type { SupabaseClient } from '@supabase/supabase-js';
import type { CoachProfile } from './displayName';
import { isCoachTitle } from './titles';

type ProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  title: string;
};

// Fills `author` on every answer from coach_profiles (spec 020), with one
// query. An answer whose author has no coach profile gets `author: null`.
export async function withAuthors<
  T extends { responses: { author_id?: string | null }[] },
>(
  client: SupabaseClient,
  threads: T[],
): Promise<
  (T & {
    responses: (T['responses'][number] & { author: CoachProfile | null })[];
  })[]
> {
  const ids = [
    ...new Set(
      threads.flatMap((t) =>
        t.responses.flatMap((r) => (r.author_id ? [r.author_id] : [])),
      ),
    ),
  ];
  const byId = new Map<string, CoachProfile>();
  if (ids.length > 0) {
    const { data } = await client
      .from('coach_profiles')
      .select('user_id, first_name, last_name, title')
      .in('user_id', ids);
    for (const row of (data ?? []) as ProfileRow[]) {
      if (!isCoachTitle(row.title)) continue;
      byId.set(row.user_id, {
        first_name: row.first_name,
        last_name: row.last_name,
        title: row.title,
      });
    }
  }
  return threads.map((t) => ({
    ...t,
    responses: t.responses.map((r) => ({
      ...r,
      author: (r.author_id && byId.get(r.author_id)) || null,
    })),
  }));
}
