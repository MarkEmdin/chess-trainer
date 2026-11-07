import {
  chooseNickname,
  updateExternalUsernames,
  updateNickname,
} from '@/lib/auth/profileActions';
import { revalidatePath } from 'next/cache';
import { redirect } from '@/i18n/navigation';

const eq = jest.fn();
const update = jest.fn(() => ({ eq }));
const getUser = jest.fn();
const rpc = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({ update }),
    rpc,
  }),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/i18n/navigation', () => ({ redirect: jest.fn() }));

jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
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

describe.each([
  ['updateNickname', updateNickname],
  ['chooseNickname', chooseNickname],
])('%s', (_name, action) => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ error: null });
    (revalidatePath as jest.Mock).mockClear();
    (redirect as unknown as jest.Mock).mockClear();
  });

  it('refuses a bad format without calling the database', async () => {
    const result = await action(undefined, formData({ nickname: 'a b' }));
    expect(result).toEqual({ error: 'auth.errors.nicknameFormat' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reports a taken nickname', async () => {
    rpc.mockResolvedValue({ error: { code: '23505', message: 'dup' } });
    const result = await action(undefined, formData({ nickname: 'alice' }));
    expect(result).toEqual({ error: 'auth.errors.nicknameTaken' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('hides other database errors', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockResolvedValue({ error: { code: 'XX000', message: 'boom' } });
    const result = await action(undefined, formData({ nickname: 'alice' }));
    expect(result).toEqual({ error: 'common.serverError' });
  });

  it('saves the trimmed value and refreshes the header', async () => {
    await action(undefined, formData({ nickname: ' alice ' }));
    expect(rpc).toHaveBeenCalledWith('set_nickname', { p_nickname: 'alice' });
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
  });
});

describe('after saving a nickname', () => {
  beforeEach(() => {
    rpc.mockResolvedValue({ error: null });
    (redirect as unknown as jest.Mock).mockClear();
  });

  it('updateNickname stays on the page', async () => {
    const result = await updateNickname(
      undefined,
      formData({ nickname: 'alice' }),
    );
    expect(result).toEqual({ success: true });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('chooseNickname goes home', async () => {
    await chooseNickname(undefined, formData({ nickname: 'alice' }));
    expect(redirect).toHaveBeenCalledWith({ href: '/', locale: 'en' });
  });
});
