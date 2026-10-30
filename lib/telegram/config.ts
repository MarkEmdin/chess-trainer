export type TelegramConfig = { token: string; username: string; secret: string };

// The feature is off unless all three variables are set.
export function telegramConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const username = process.env.TELEGRAM_BOT_USERNAME;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !username || !secret) return null;
  return { token, username, secret };
}
