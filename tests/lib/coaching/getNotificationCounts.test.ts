import { getNotificationCounts } from '@/lib/coaching/getNotificationCounts';

let result: { data: unknown[] | null; error: unknown } = {
  data: [],
  error: null,
};
const selected = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: async (columns: string) => {
        selected(columns);
        return result;
      },
    }),
  }),
}));

const student = {
  id: 'u1',
  email: '',
  nickname: 'kid',
  role: 'user' as const,
  preferredLocale: null,
};
const admin = { ...student, id: 'a1', role: 'admin' as const };

const rows = [
  { user_id: 'u1', response_seen_at: null, coaching_responses: [{ id: 'x' }] },
  { user_id: 'a1', response_seen_at: null, coaching_responses: [{ id: 'y' }] },
  { user_id: 'u1', response_seen_at: null, coaching_responses: [] },
];

beforeEach(() => {
  result = { data: rows, error: null };
  selected.mockClear();
});

describe('getNotificationCounts', () => {
  it('reads the read state and responses', async () => {
    await getNotificationCounts(student);
    expect(selected.mock.calls[0][0]).toMatch(/response_seen_at/);
    expect(selected.mock.calls[0][0]).toMatch(/coaching_responses/);
  });

  it('counts a student’s own unseen answers', async () => {
    expect(await getNotificationCounts(student)).toEqual({
      unseenAnswers: 1,
      newQuestions: null,
    });
  });

  it('adds new questions for an admin', async () => {
    expect(await getNotificationCounts(admin)).toEqual({
      unseenAnswers: 1,
      newQuestions: 1,
    });
  });

  it('falls back to zero when the query fails', async () => {
    result = { data: null, error: { message: 'boom' } };
    expect(await getNotificationCounts(admin)).toEqual({
      unseenAnswers: 0,
      newQuestions: 0,
    });
    expect(await getNotificationCounts(student)).toEqual({
      unseenAnswers: 0,
      newQuestions: null,
    });
  });
});
