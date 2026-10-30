import { shouldOfferTelegram } from '@/lib/telegram/prompt';

type Result = { data: unknown; error: unknown };
const results: Record<string, Result> = {};
const from = jest.fn((table: string) => ({
  select: () => ({
    eq: () => ({ maybeSingle: async () => results[table] }),
  }),
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from }),
}));

const telegramConfig = jest.fn();
jest.mock('@/lib/telegram/config', () => ({
  telegramConfig: () => telegramConfig(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  telegramConfig.mockReturnValue({ token: 't', username: 'b', secret: 's' });
  results.user_profiles = {
    data: { telegram_prompt_dismissed: false },
    error: null,
  };
  results.telegram_links = { data: null, error: null };
});

describe('shouldOfferTelegram', () => {
  it('is false without touching the DB when the bot is off', async () => {
    telegramConfig.mockReturnValue(null);
    expect(await shouldOfferTelegram('u1')).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('is true when not linked and not dismissed', async () => {
    expect(await shouldOfferTelegram('u1')).toBe(true);
  });

  it('is false when already linked', async () => {
    results.telegram_links = { data: { user_id: 'u1' }, error: null };
    expect(await shouldOfferTelegram('u1')).toBe(false);
  });

  it('is false when dismissed', async () => {
    results.user_profiles = {
      data: { telegram_prompt_dismissed: true },
      error: null,
    };
    expect(await shouldOfferTelegram('u1')).toBe(false);
  });

  it.each(['user_profiles', 'telegram_links'])(
    'is false when the %s query fails',
    async (table) => {
      results[table] = { data: null, error: { message: 'boom' } };
      expect(await shouldOfferTelegram('u1')).toBe(false);
    },
  );

  it('is false when there is no profile row', async () => {
    results.user_profiles = { data: null, error: null };
    expect(await shouldOfferTelegram('u1')).toBe(false);
  });
});
