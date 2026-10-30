import { escapeHtml, sendMessage } from '@/lib/telegram/api';

const KEYS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME', 'TELEGRAM_WEBHOOK_SECRET'] as const;

describe('telegram api', () => {
  const original = { ...process.env };
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_BOT_USERNAME = 'bot';
    process.env.TELEGRAM_WEBHOOK_SECRET = 's';
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...original };
    global.fetch = realFetch;
  });

  it('posts to /bot<token>/sendMessage with chat_id, HTML parse mode, one button per row', async () => {
    const result = await sendMessage(42, {
      text: 'hi',
      buttons: [{ text: 'Open', url: 'https://x.test/a' }],
    });
    expect(result).toBe('ok');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottok/sendMessage');
    expect(JSON.parse(init.body)).toEqual({
      chat_id: 42,
      text: 'hi',
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: 'Open', url: 'https://x.test/a' }]] },
      link_preview_options: { is_disabled: true },
    });
  });

  it('omits reply_markup when there are no buttons', async () => {
    await sendMessage(1, { text: 'hi' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('reply_markup');
  });

  it("returns 'blocked' on 403", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    expect(await sendMessage(1, { text: 'x' })).toBe('blocked');
  });

  it("returns 'error' on 500", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    expect(await sendMessage(1, { text: 'x' })).toBe('error');
  });

  it("returns 'error' when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    expect(await sendMessage(1, { text: 'x' })).toBe('error');
  });

  it('passes an abort signal and returns error on timeout', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    expect(await sendMessage(1, { text: 'x' })).toBe('error');
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('logs status and body on a 400 without the token', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad button url' });
      expect(await sendMessage(1, { text: 'x' })).toBe('error');
      expect(spy).toHaveBeenCalledWith('telegram sendMessage failed', 400, 'bad button url');
      expect(JSON.stringify(spy.mock.calls)).not.toContain('tok');
    } finally {
      spy.mockRestore();
    }
  });

  it("returns 'error' without calling fetch when config is null", async () => {
    for (const k of KEYS) delete process.env[k];
    expect(await sendMessage(1, { text: 'x' })).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('escapeHtml escapes <, > and &', () => {
    expect(escapeHtml('<a & b>')).toBe('&lt;a &amp; b&gt;');
  });
});
