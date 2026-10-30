import { telegramConfig } from './config';

export type Button = { text: string; url: string };
export type BotMessage = { text: string; buttons?: Button[] };

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Never throws. 'blocked' means the user blocked the bot (403).
export async function sendMessage(
  chatId: number,
  msg: BotMessage,
): Promise<'ok' | 'blocked' | 'error'> {
  const config = telegramConfig();
  if (!config) return 'error';
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg.text,
        parse_mode: 'HTML',
        ...(msg.buttons?.length && {
          reply_markup: { inline_keyboard: msg.buttons.map((b) => [{ text: b.text, url: b.url }]) },
        }),
        link_preview_options: { is_disabled: true },
      }),
    });
    if (res.ok) return 'ok';
    return res.status === 403 ? 'blocked' : 'error';
  } catch {
    return 'error';
  }
}
