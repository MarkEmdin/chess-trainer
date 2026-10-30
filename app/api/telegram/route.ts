import { NextRequest } from 'next/server';
import { telegramConfig } from '@/lib/telegram/config';
import {
  consumeLinkToken,
  findLinkByChat,
  unlinkChat,
} from '@/lib/telegram/link';
import { unansweredList } from '@/lib/telegram/notify';
import { sendMessage } from '@/lib/telegram/api';
import {
  connectedMessage,
  infoMessage,
  toBotLocale,
} from '@/lib/telegram/messages';

type Update = {
  message?: {
    chat?: { id?: number; type?: string };
    from?: { language_code?: string };
    text?: string;
  };
};

// Behind a proxy (Vercel, a dev tunnel) `req.url` carries the server's own
// address, but Telegram buttons need the public one. Spoofing these headers
// takes the webhook secret, which the caller has already proven.
function publicOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return new URL(req.url).origin;
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest): Promise<Response> {
  const config = telegramConfig();
  if (!config) return new Response(null, { status: 404 });
  if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== config.secret) {
    return new Response(null, { status: 401 });
  }

  try {
    const update = (await req.json()) as Update;
    const message = update.message;
    const chatId = message?.chat?.id;
    const text = message?.text;
    if (message?.chat?.type !== 'private' || chatId === undefined || !text) {
      return new Response(null, { status: 200 });
    }

    const origin = publicOrigin(req);
    const [first = '', arg] = text.trim().split(/\s+/);
    const command = first.split('@')[0];

    const link = await findLinkByChat(chatId);
    const locale = link?.locale ?? toBotLocale(message.from?.language_code);
    const info = (key: Parameters<typeof infoMessage>[1]) =>
      infoMessage(locale, key, `${origin}/${locale}/profile`);

    if (command === '/start') {
      if (!arg) {
        await sendMessage(chatId, info('startNoCode'));
      } else {
        const linked = await consumeLinkToken(arg, chatId);
        await sendMessage(
          chatId,
          linked
            ? connectedMessage(linked.locale, linked.nickname, linked.isAdmin)
            : info('expired'),
        );
      }
    } else if (command === '/stop') {
      await unlinkChat(chatId);
      await sendMessage(chatId, info('stopped'));
    } else if (command === '/new' && link?.isAdmin) {
      await sendMessage(chatId, await unansweredList(origin, locale, new Date()));
    } else {
      await sendMessage(chatId, info(link ? 'help' : 'helpUnlinked'));
    }
  } catch (e) {
    console.error('telegram webhook failed', e);
  }
  return new Response(null, { status: 200 });
}
