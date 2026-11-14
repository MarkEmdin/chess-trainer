import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildMessage,
  fetchAllPages,
  writeJsonAtomic,
  planRecipients,
  sendAll,
  toLocale,
} from '@/scripts/broadcast.mjs';
import en from '@/messages/en.json';
import ru from '@/messages/ru.json';

describe('toLocale', () => {
  it('keeps Russian and falls back to English', () => {
    expect(toLocale('ru')).toBe('ru');
    expect(toLocale('de')).toBe('en');
    expect(toLocale(null)).toBe('en');
  });
});

describe('buildMessage', () => {
  it('builds the localized text and a button to the page', () => {
    const msg = buildMessage({ en, ru }, 'ask-any-move', 'ru', 'https://x');
    expect(msg.text).toBe(ru.telegram.announcements.askAnyMove.text);
    expect(msg.button).toEqual({
      text: 'Открыть партии',
      url: 'https://x/ru/games',
    });
  });

  it('rejects an unknown announcement', () => {
    expect(() => buildMessage({ en, ru }, 'nope', 'en', 'https://x')).toThrow(
      /unknown announcement/i,
    );
  });
});

describe('planRecipients', () => {
  it("skips chats already sent to and uses each user's locale", () => {
    const plan = planRecipients(
      [
        { chat_id: 1, user_id: 'a' },
        { chat_id: 2, user_id: 'b' },
        { chat_id: 3, user_id: 'c' },
      ],
      [
        { id: 'a', preferred_locale: 'ru' },
        { id: 'b', preferred_locale: null },
      ],
      new Set([3]),
    );
    expect(plan).toEqual({
      todo: [
        { chatId: 1, locale: 'ru' },
        { chatId: 2, locale: 'en' },
      ],
      skipped: 1,
    });
  });
});

describe('sendAll', () => {
  const todo = [
    { chatId: 1, locale: 'en' as const },
    { chatId: 2, locale: 'ru' as const },
  ];
  const deps = () => ({
    sleep: jest.fn(async () => {}),
    onSent: jest.fn(),
    onBlocked: jest.fn(),
  });

  it('logs every delivered chat', async () => {
    const d = deps();
    const send = jest.fn(async () => ({ ok: true as const }));
    const result = await sendAll(todo, { ...d, send });
    expect(result).toEqual({ sent: 2, blocked: 0, failed: 0 });
    expect(d.onSent.mock.calls).toEqual([[1], [2]]);
    expect(send).toHaveBeenCalledWith(2, 'ru');
  });

  it('unlinks a chat that blocked the bot and does not log it', async () => {
    const d = deps();
    const send = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true });
    const result = await sendAll(todo, { ...d, send });
    expect(result).toEqual({ sent: 1, blocked: 1, failed: 0 });
    expect(d.onBlocked).toHaveBeenCalledWith(1);
    expect(d.onSent.mock.calls).toEqual([[2]]);
  });

  it('waits out a rate limit and retries once', async () => {
    const d = deps();
    const send = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, retryAfter: 3 })
      .mockResolvedValue({ ok: true });
    const result = await sendAll(todo, { ...d, send });
    expect(result.sent).toBe(2);
    expect(d.sleep).toHaveBeenCalledWith(3000);
  });

  it('counts a chat as failed after a second rate limit and goes on', async () => {
    const d = deps();
    const send = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, retryAfter: 1 })
      .mockResolvedValueOnce({ ok: false, status: 429, retryAfter: 1 })
      .mockResolvedValueOnce({ ok: true });
    const result = await sendAll(todo, { ...d, send });
    expect(result).toEqual({ sent: 1, blocked: 0, failed: 1 });
    expect(d.onSent.mock.calls).toEqual([[2]]);
  });

  it('paces messages with a gap between sends', async () => {
    const d = deps();
    const send = jest.fn(async () => ({ ok: true as const }));
    await sendAll(todo, { ...d, send, gapMs: 50 });
    expect(d.sleep).toHaveBeenCalledWith(50);
  });
});

describe('fetchAllPages', () => {
  it('reads past the server row limit, page by page', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => i);
    const fetchPage = jest.fn(async (from: number, to: number) =>
      rows.slice(from, to + 1),
    );
    expect(await fetchAllPages(fetchPage, 2)).toEqual(rows);
    expect(fetchPage.mock.calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });
});

describe('writeJsonAtomic', () => {
  it('replaces the file whole and leaves no temp file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'broadcast-'));
    const path = join(dir, 'x.sent.json');
    writeJsonAtomic(path, [1]);
    writeJsonAtomic(path, [1, 2]);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual([1, 2]);
    expect(readdirSync(dir)).toEqual(['x.sent.json']);
  });
});
