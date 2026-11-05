import { updateExternalUsernames } from '@/lib/auth/profileActions';

const eq = jest.fn();
const update = jest.fn(() => ({ eq }));
const getUser = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({ update }),
  }),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

function formData(entries: Record<string, string>) {
  const fd = new FormData();
  Object.entries(entries).forEach(([key, value]) => fd.append(key, value));
  return fd;
}

describe('updateExternalUsernames show_in_leaderboard', () => {
  beforeEach(() => {
    update.mockClear();
    eq.mockReset();
    eq.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('stores false when the checkbox is absent', async () => {
    await updateExternalUsernames(undefined, formData({}));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ show_in_leaderboard: false }),
    );
  });

  it('stores true when the checkbox is on', async () => {
    const result = await updateExternalUsernames(
      undefined,
      formData({ show_in_leaderboard: 'on' }),
    );
    expect(result).toEqual({ success: true });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ show_in_leaderboard: true }),
    );
  });
});
