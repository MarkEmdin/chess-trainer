import { getAuthedUser } from '@/lib/auth/getUser';

const single = jest.fn();

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: <T,>(fn: T) => fn,
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
  }),
}));

describe('getAuthedUser nicknameSet', () => {
  it('passes through a placeholder nickname state', async () => {
    single.mockResolvedValue({ data: { nickname_set: false } });
    expect((await getAuthedUser())?.nicknameSet).toBe(false);
  });

  it('never nags when the profile could not be read', async () => {
    single.mockResolvedValue({ data: null });
    expect((await getAuthedUser())?.nicknameSet).toBe(true);
  });
});
