// One message about a release to every chat linked to the bot (spec 038).
//
// Dry run (sends nothing, prints counts and the texts):
//   node --env-file=.env.prod.local scripts/telegram-broadcast.mjs ask-any-move https://<site>
// Send:
//   node --env-file=.env.prod.local scripts/telegram-broadcast.mjs ask-any-move https://<site> --send
//
// Every delivered chat is appended to scripts/announcements/<id>.sent.json
// right away, and re-runs skip those chats: a crash or a second run never
// sends twice. Keep that file until the announcement is done.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANNOUNCEMENTS,
  buildMessage,
  fetchAllPages,
  planRecipients,
  sendAll,
  writeJsonAtomic,
} from './broadcast.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [id, rawSite, flag] = process.argv.slice(2);
const site = rawSite?.replace(/\/+$/, '');
const send = flag === '--send';
const env = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  token: process.env.TELEGRAM_BOT_TOKEN,
};

if (
  !id ||
  !site ||
  (flag && !send) ||
  !(id in ANNOUNCEMENTS) ||
  !env.url ||
  !env.key ||
  !env.token
) {
  console.error(
    'Usage: node --env-file=.env.prod.local scripts/telegram-broadcast.mjs <id> https://<site> [--send]\n' +
      `Announcements: ${Object.keys(ANNOUNCEMENTS).join(', ')}\n` +
      'Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and TELEGRAM_BOT_TOKEN in the env.',
  );
  process.exit(1);
}

const messages = {
  en: JSON.parse(readFileSync(join(root, 'messages/en.json'), 'utf8')),
  ru: JSON.parse(readFileSync(join(root, 'messages/ru.json'), 'utf8')),
};
const built = {
  en: buildMessage(messages, id, 'en', site),
  ru: buildMessage(messages, id, 'ru', site),
};

const logPath = join(root, 'scripts/announcements', `${id}.sent.json`);
/** @type {number[]} */
const sentLog = existsSync(logPath)
  ? JSON.parse(readFileSync(logPath, 'utf8'))
  : [];

// Plain PostgREST over fetch: supabase-js needs a WebSocket, which Node 20
// doesn't have.
async function rest(path, init = {}) {
  const res = await fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return init.method === 'DELETE' ? null : res.json();
}

// Whole table, ordered so pages are stable, past the 1000-row cap.
const readAll = (path) =>
  fetchAllPages((from, to) =>
    rest(path, { headers: { Range: `${from}-${to}` } }),
  );

/** @type {{ chat_id: number, user_id: string }[]} */
const links = await readAll(
  'telegram_links?select=chat_id,user_id&order=chat_id',
);
// Every profile rather than `id=in.(...)`: that URL grows with each user.
/** @type {{ id: string, preferred_locale: string | null }[]} */
const profiles = links.length
  ? await readAll('user_profiles?select=id,preferred_locale&order=id')
  : [];

const { todo, skipped } = planRecipients(links, profiles, new Set(sentLog));
const perLocale = (locale) => todo.filter((r) => r.locale === locale).length;

console.log(`Announcement: ${id}`);
console.log(`Linked chats: ${links.length}, already sent: ${skipped}`);
console.log(
  `To send: ${todo.length} (ru ${perLocale('ru')}, en ${perLocale('en')})`,
);
for (const locale of ['ru', 'en']) {
  console.log(`\n[${locale}] ${built[locale].text}`);
  console.log(
    `[${locale}] button: ${built[locale].button.text} -> ${built[locale].button.url}`,
  );
}

if (!send) {
  console.log('\nDry run: nothing sent. Add --send to send.');
  process.exit(0);
}

mkdirSync(dirname(logPath), { recursive: true });

async function telegramSend(chatId, locale) {
  const msg = built[locale];
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${env.token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg.text,
          reply_markup: {
            inline_keyboard: [[{ text: msg.button.text, url: msg.button.url }]],
          },
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    if (res.status !== 403 && res.status !== 429) {
      console.error(`chat ${chatId}: ${res.status} ${JSON.stringify(body)}`);
    }
    return {
      ok: false,
      status: res.status,
      retryAfter: body?.parameters?.retry_after,
    };
  } catch (e) {
    console.error(`chat ${chatId}: ${e}`);
    return { ok: false, status: 0 };
  }
}

const result = await sendAll(todo, {
  send: telegramSend,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  onSent: (chatId) => {
    sentLog.push(chatId);
    writeJsonAtomic(logPath, sentLog);
  },
  onBlocked: async (chatId) => {
    await rest(`telegram_links?chat_id=eq.${chatId}`, {
      method: 'DELETE',
    }).catch((e) => console.error(`unlink ${chatId}: ${e.message}`));
  },
});

console.log(
  `\nSent ${result.sent}, skipped ${skipped}, blocked (unlinked) ${result.blocked}, failed ${result.failed}.`,
);
if (result.failed) console.log('Run again to retry the failed chats.');
