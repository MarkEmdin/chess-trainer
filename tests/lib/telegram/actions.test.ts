import { revalidatePath } from 'next/cache';
import {
  disconnectTelegram,
  setTelegramPromptDismissed,
  startTelegramLink,
} from '@/lib/telegram/actions';

const del = jest.fn();
const update = jest.fn();
const eq = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      update: (values: unknown) => {
        update(table, values);
        return {
          eq: async (...args: unknown[]) => {
            eq(...args);
            return { error: null };
          },
        };
      },
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
    expect(await startTelegramLink()).toEqual({
      error: 'telegram.errors.connectFailed',
    });
  });

  it('returns connectFailed when creating the token throws', async () => {
    createLinkToken.mockRejectedValue(new Error('db down'));
    expect(await startTelegramLink()).toEqual({
      error: 'telegram.errors.connectFailed',
    });
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

describe('setTelegramPromptDismissed', () => {
  it.each([true, false])('saves %s on the own profile row', async (value) => {
    await setTelegramPromptDismissed(value);
    expect(update).toHaveBeenCalledWith('user_profiles', {
      telegram_prompt_dismissed: value,
    });
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('reports success', async () => {
    expect(await setTelegramPromptDismissed(true)).toEqual({ ok: true });
  });

  it('does nothing when signed out', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect(await setTelegramPromptDismissed(true)).toEqual({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a non-boolean value', async () => {
    expect(
      await setTelegramPromptDismissed('yes' as unknown as boolean),
    ).toEqual({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });
});
