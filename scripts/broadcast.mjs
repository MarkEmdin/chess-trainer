// Helpers for scripts/telegram-broadcast.mjs (spec 038). Plain ESM so the
// script runs on Node 20 without the app; tested from tests/scripts.
import { renameSync, writeFileSync } from 'node:fs';

/** @typedef {'en' | 'ru'} Locale */
/** @typedef {{ chatId: number, locale: Locale }} Recipient */
/** @typedef {{ ok: true } | { ok: false, status: number, retryAfter?: number }} SendResult */

// Announcement id (CLI argument) -> messages key under
// `telegram.announcements` and the page the button opens.
export const ANNOUNCEMENTS = {
  'ask-any-move': { key: 'askAnyMove', path: '/games' },
};

/**
 * Same rule as the bot: Russian when asked for, English otherwise.
 * @param {string | null | undefined} x
 * @returns {Locale}
 */
export function toLocale(x) {
  return x === 'ru' ? 'ru' : 'en';
}

/**
 * @param {Record<Locale, any>} messages parsed messages/{en,ru}.json
 * @param {string} id
 * @param {Locale} locale
 * @param {string} site origin without a trailing slash
 * @returns {{ text: string, button: { text: string, url: string } }}
 */
export function buildMessage(messages, id, locale, site) {
  const announcement =
    ANNOUNCEMENTS[/** @type {keyof typeof ANNOUNCEMENTS} */ (id)];
  if (!announcement) throw new Error(`Unknown announcement: ${id}`);
  const copy = messages[locale].telegram.announcements[announcement.key];
  return {
    text: copy.text,
    button: { text: copy.button, url: `${site}/${locale}${announcement.path}` },
  };
}

/**
 * @param {{ chat_id: number, user_id: string }[]} links
 * @param {{ id: string, preferred_locale: string | null }[]} profiles
 * @param {Set<number>} sent chats already delivered in an earlier run
 * @returns {{ todo: Recipient[], skipped: number }}
 */
export function planRecipients(links, profiles, sent) {
  const localeOf = new Map(profiles.map((p) => [p.id, p.preferred_locale]));
  const todo = links
    .filter((l) => !sent.has(l.chat_id))
    .map((l) => ({
      chatId: l.chat_id,
      locale: toLocale(localeOf.get(l.user_id)),
    }));
  return { todo, skipped: links.length - todo.length };
}

/**
 * Sends one by one with a pause between messages. A 429 is waited out and
 * retried once; a 403 means the user blocked the bot.
 * @param {Recipient[]} todo
 * @param {{
 *   send: (chatId: number, locale: Locale) => Promise<SendResult>,
 *   sleep: (ms: number) => Promise<void>,
 *   onSent: (chatId: number) => void,
 *   onBlocked: (chatId: number) => void | Promise<void>,
 *   gapMs?: number,
 * }} deps
 * @returns {Promise<{ sent: number, blocked: number, failed: number }>}
 */
export async function sendAll(
  todo,
  { send, sleep, onSent, onBlocked, gapMs = 50 },
) {
  const result = { sent: 0, blocked: 0, failed: 0 };
  for (const [i, { chatId, locale }] of todo.entries()) {
    if (i > 0) await sleep(gapMs);
    let res = await send(chatId, locale);
    if (!res.ok && res.status === 429) {
      await sleep((res.retryAfter ?? 1) * 1000);
      res = await send(chatId, locale);
    }
    if (res.ok) {
      result.sent++;
      onSent(chatId);
    } else if (res.status === 403) {
      result.blocked++;
      await onBlocked(chatId);
    } else {
      result.failed++;
    }
  }
  return result;
}

/**
 * PostgREST returns at most `max_rows` (1000) rows per request: read pages
 * until one comes back short.
 * @template T
 * @param {(from: number, to: number) => Promise<T[]>} fetchPage inclusive range
 * @param {number} [pageSize]
 * @returns {Promise<T[]>}
 */
export async function fetchAllPages(fetchPage, pageSize = 1000) {
  /** @type {T[]} */
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}

/**
 * Write-then-rename, so a crash mid-write never leaves a half-written log.
 * @param {string} path
 * @param {unknown} value
 */
export function writeJsonAtomic(path, value) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(value));
  renameSync(tmp, path);
}
