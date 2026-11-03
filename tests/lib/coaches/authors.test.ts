import type { SupabaseClient } from '@supabase/supabase-js';
import { withAuthors } from '@/lib/coaches/authors';

const inCalls: unknown[][] = [];
const profiles = [
  { user_id: 'c1', first_name: 'Ivan', last_name: 'Petrov', title: 'IM' },
];

const client = {
  // Only the calls withAuthors makes.
  from: (table: string) => ({
    select: () => ({
      in: async (column: string, ids: string[]) => {
        inCalls.push([table, column, ids]);
        return { data: profiles.filter((p) => ids.includes(p.user_id)) };
      },
    }),
  }),
} as unknown as SupabaseClient;

beforeEach(() => {
  inCalls.length = 0;
});

describe('withAuthors', () => {
  it('attaches the coach profile to each answer in one query', async () => {
    const threads = [
      { responses: [{ author_id: 'c1' }, { author_id: 'gone' }] },
      { responses: [{ author_id: 'c1' }] },
    ];
    const out = await withAuthors(client, threads);
    expect(inCalls).toEqual([['coach_profiles', 'user_id', ['c1', 'gone']]]);
    expect(out[0].responses[0].author).toEqual({
      first_name: 'Ivan',
      last_name: 'Petrov',
      title: 'IM',
    });
    expect(out[0].responses[1].author).toBeNull();
    expect(out[1].responses[0].author?.first_name).toBe('Ivan');
  });

  it('skips the query when no answer has an author', async () => {
    const out = await withAuthors(client, [
      { responses: [{ author_id: null }] },
    ]);
    expect(inCalls).toEqual([]);
    expect(out[0].responses[0].author).toBeNull();
  });
});
