/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/telegram/route';
import { telegramConfig } from '@/lib/telegram/config';
import {
  consumeLinkToken,
  findLinkByChat,
  unlinkChat,
} from '@/lib/telegram/link';
import { unansweredList } from '@/lib/telegram/notify';
import { sendMessage } from '@/lib/telegram/api';
import { connectedMessage, infoMessage } from '@/lib/telegram/messages';

jest.mock('@/lib/telegram/config');
jest.mock('@/lib/telegram/link');
jest.mock('@/lib/telegram/notify');
jest.mock('@/lib/telegram/api', () => ({
  ...jest.requireActual('@/lib/telegram/api'),
  sendMessage: jest.fn(),
}));

const PROFILE = 'https://example.com/ru/profile';
const PROFILE_EN = 'https://example.com/en/profile';

function post(
  body: unknown,
  secret: string | null = 's3cret',
  extraHeaders: Record<string, string> = {},
) {
  const headers: Record<string, string> = { ...extraHeaders };
  if (secret !== null) headers['X-Telegram-Bot-Api-Secret-Token'] = secret;
  return POST(
    new NextRequest('https://example.com/api/telegram', {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

const msg = (text?: string, type = 'private') => ({
  message: {
    chat: { id: 7, type },
    from: { language_code: 'ru' },
    ...(text === undefined ? {} : { text }),
  },
});

describe('POST /api/telegram', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (telegramConfig as jest.Mock).mockReturnValue({
      token: 't',
      username: 'bot',
      secret: 's3cret',
    });
    (findLinkByChat as jest.Mock).mockResolvedValue(null);
  });

  it('404s when the feature is off', async () => {
    (telegramConfig as jest.Mock).mockReturnValue(null);
    expect((await post(msg('/start'))).status).toBe(404);
  });

  it.each([null, 'wrong'])('401s with secret %s', async (secret) => {
    expect((await post(msg('/start'), secret)).status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('links on /start with a valid code', async () => {
    (consumeLinkToken as jest.Mock).mockResolvedValue({
      nickname: 'Ann',
      isAdmin: false,
      locale: 'en',
    });
    const res = await post(msg('/start abc'));
    expect(res.status).toBe(200);
    expect(consumeLinkToken).toHaveBeenCalledWith('abc', 7);
    expect(sendMessage).toHaveBeenCalledWith(
      7,
      connectedMessage('en', 'Ann', false),
    );
  });

  it('replies expired on /start with a bad code', async () => {
    (consumeLinkToken as jest.Mock).mockResolvedValue(null);
    await post(msg('/start nope'));
    expect(sendMessage).toHaveBeenCalledWith(
      7,
      infoMessage('ru', 'expired', PROFILE),
    );
  });

  it('replies startNoCode in ru on bare /start', async () => {
    await post(msg('/start'));
    expect(sendMessage).toHaveBeenCalledWith(
      7,
      infoMessage('ru', 'startNoCode', PROFILE),
    );
  });

  it('builds links from the forwarded public host behind a proxy', async () => {
    await post(msg('/start'), 's3cret', {
      'x-forwarded-host': 'public.test',
      'x-forwarded-proto': 'https',
    });
    expect(sendMessage).toHaveBeenCalledWith(
      7,
      infoMessage('ru', 'startNoCode', 'https://public.test/ru/profile'),
    );
  });

  it('falls back to the Host header', async () => {
    await post(msg('/start'), 's3cret', { host: 'tunnel.test' });
    expect(sendMessage).toHaveBeenCalledWith(
      7,
      infoMessage('ru', 'startNoCode', 'https://tunnel.test/ru/profile'),
    );
  });

  it.each(['/new', '/new@somebot'])('%s from a linked admin lists', async (t) => {
    (findLinkByChat as jest.Mock).mockResolvedValue({
      userId: 'u',
      isAdmin: true,
      locale: 'en',
    });
    const list = { text: 'list' };
    (unansweredList as jest.Mock).mockResolvedValue(list);
    await post(msg(t));
    expect(unansweredList).toHaveBeenCalledWith(
      'https://example.com',
      'en',
      expect.any(Date),
    );
    expect(sendMessage).toHaveBeenCalledWith(7, list);
  });

  it('/new from a linked non-admin gets help', async () => {
    (findLinkByChat as jest.Mock).mockResolvedValue({
      userId: 'u',
      isAdmin: false,
      locale: 'en',
    });
    await post(msg('/new'));
    expect(unansweredList).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(
      7,
      infoMessage('en', 'help', PROFILE_EN),
    );
  });

  it('/stop unlinks and confirms', async () => {
    await post(msg('/stop'));
    expect(unlinkChat).toHaveBeenCalledWith(7);
    expect(sendMessage).toHaveBeenCalledWith(
      7,
      infoMessage('ru', 'stopped', PROFILE),
    );
  });

  it('other text from an unlinked chat gets helpUnlinked', async () => {
    await post(msg('hello'));
    expect(sendMessage).toHaveBeenCalledWith(
      7,
      infoMessage('ru', 'helpUnlinked', PROFILE),
    );
  });

  it.each([
    ['edited_message', { edited_message: msg('/new').message }],
    ['no text', msg()],
    ['group chat', msg('/new', 'group')],
  ])('ignores %s', async (_n, body) => {
    expect((await post(body)).status).toBe(200);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('still 200s when a handler throws', async () => {
    (consumeLinkToken as jest.Mock).mockRejectedValue(new Error('db'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await post(msg('/start abc'))).status).toBe(200);
  });

  it('200s on malformed JSON', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await post('{nope')).status).toBe(200);
  });
});
