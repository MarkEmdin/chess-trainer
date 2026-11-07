import { getNotificationCounts } from '@/lib/coaching/getNotificationCounts';

let result: { data: unknown[] | null; error: unknown } = {
  data: [],
  error: null,
};
let pending: { count: number | null } = { count: 2 };
const selected = jest.fn();
const applicationQuery = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) =>
      table === 'coach_applications'
        ? {
            select: (columns: string, opts: unknown) => ({
              eq: async (column: string, value: string) => {
                applicationQuery(columns, opts, column, value);
                return pending;
              },
            }),
          }
        : {
            select: async (columns: string) => {
              selected(columns);
              return result;
            },
          },
  }),
}));

const student = {
  id: 'u1',
  email: '',
  nickname: 'kid',
  nicknameSet: true,
  role: 'user' as const,
  preferredLocale: null,
};
const admin = { ...student, id: 'a1', role: 'admin' as const };
const coach = { ...student, id: 'c1', role: 'coach' as const };

const rows = [
  { user_id: 'u1', response_seen_at: null, coaching_responses: [{ id: 'x' }] },
  { user_id: 'a1', response_seen_at: null, coaching_responses: [{ id: 'y' }] },
  { user_id: 'u1', response_seen_at: null, coaching_responses: [] },
];

beforeEach(() => {
  result = { data: rows, error: null };
  pending = { count: 2 };
  selected.mockClear();
  applicationQuery.mockClear();
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
      pendingApplications: null,
    });
    expect(applicationQuery).not.toHaveBeenCalled();
  });

  it('adds new questions and pending applications for an admin', async () => {
    expect(await getNotificationCounts(admin)).toEqual({
      unseenAnswers: 1,
      newQuestions: 1,
      pendingApplications: 2,
    });
    expect(applicationQuery).toHaveBeenCalledWith(
      'id',
      { count: 'exact', head: true },
      'status',
      'pending',
    );
  });

  it('adds new questions, but not applications, for a coach', async () => {
    expect(await getNotificationCounts(coach)).toEqual({
      unseenAnswers: 0,
      newQuestions: 1,
      pendingApplications: null,
    });
  });

  it('falls back to zero when the query fails', async () => {
    result = { data: null, error: { message: 'boom' } };
    pending = { count: null };
    expect(await getNotificationCounts(admin)).toEqual({
      unseenAnswers: 0,
      newQuestions: 0,
      pendingApplications: 0,
    });
    expect(await getNotificationCounts(student)).toEqual({
      unseenAnswers: 0,
      newQuestions: null,
      pendingApplications: null,
    });
  });
});
