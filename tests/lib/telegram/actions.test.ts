import { revalidatePath } from 'next/cache';
import { disconnectTelegram, startTelegramLink } from '@/lib/telegram/actions';

const del = jest.fn();
const eq = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      delete: () => {
        del(table);
        return {
          eq: async (...args: unknown[]) => {
            eq(...args);
            return { error: null };
          },
        };
      },
    }),
  }),
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

const telegramConfig = jest.fn();
jest.mock('@/lib/telegram/config', () => ({
  telegramConfig: () => telegramConfig(),
}));

const createLinkToken = jest.fn();
jest.mock('@/lib/telegram/link', () => ({
  createLinkToken: (...args: unknown[]) => createLinkToken(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  getAuthedUser.mockResolvedValue({ id: 'u1' });
  telegramConfig.mockReturnValue({
    token: 't',
    username: 'chess_bot',
    secret: 's',
  });
  createLinkToken.mockResolvedValue('tok123');
});

describe('startTelegramLink', () => {
  it('returns an error when signed out', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect(await startTelegramLink()).toEqual({
      error: 'telegram.errors.notAuthenticated',
    });
  });

  it('returns an error when the bot is not configured', async () => {
    telegramConfig.mockReturnValue(null);
    expect(await startTelegramLink()).toHaveProperty('error');
  });

  it('returns the bot deep link with a fresh token', async () => {
    expect(await startTelegramLink()).toEqual({
      url: 'https://t.me/chess_bot?start=tok123',
    });
    expect(createLinkToken).toHaveBeenCalledWith('u1');
  });
});

describe('disconnectTelegram', () => {
  it('deletes the own link row and revalidates the profile', async () => {
    await disconnectTelegram();
    expect(del).toHaveBeenCalledWith('telegram_links');
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]/profile', 'page');
  });

  it('does nothing when signed out', async () => {
    getAuthedUser.mockResolvedValue(null);
    await disconnectTelegram();
    expect(del).not.toHaveBeenCalled();
  });
});
