import { telegramConfig } from '@/lib/telegram/config';

const KEYS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME',
  'TELEGRAM_WEBHOOK_SECRET',
] as const;

describe('telegramConfig', () => {
  const original = { ...process.env };

  beforeEach(() => {
    for (const k of KEYS) delete process.env[k];
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('returns null when any variable is missing', () => {
    process.env.TELEGRAM_BOT_TOKEN = 't';
    process.env.TELEGRAM_BOT_USERNAME = 'bot';
    expect(telegramConfig()).toBeNull();
  });

  it('returns the three values when all are set', () => {
    process.env.TELEGRAM_BOT_TOKEN = 't';
    process.env.TELEGRAM_BOT_USERNAME = 'bot';
    process.env.TELEGRAM_WEBHOOK_SECRET = 's';
    expect(telegramConfig()).toEqual({ token: 't', username: 'bot', secret: 's' });
  });
});
