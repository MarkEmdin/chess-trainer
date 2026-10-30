import { createAdminClient } from '@/lib/supabase/admin';
import { telegramConfig } from './config';
import { sendMessage, type BotMessage } from './api';
import { unlinkChat } from './link';
import {
  answeredMessage,
  newQuestionMessage,
  questionListMessage,
  toBotLocale,
  type BotLocale,
} from './messages';

async function deliver(chatId: number, msg: BotMessage): Promise<void> {
  const result = await sendMessage(chatId, msg);
  if (result === 'blocked') await unlinkChat(chatId);
}

export async function notifyAdminsOfQuestion(
  requestId: string,
  origin: string,
): Promise<void> {
  if (!telegramConfig()) return;
  try {
    const db = createAdminClient();
    const { data: request } = await db
      .from('coaching_requests')
      .select('user_id, move_san, body')
      .eq('id', requestId)
      .maybeSingle();
    if (!request) return;

    const [{ data: asker }, { data: admins }] = await Promise.all([
      db
        .from('user_profiles')
        .select('nickname')
        .eq('id', request.user_id)
        .maybeSingle(),
      db
        .from('user_profiles')
        .select('id, preferred_locale')
        .eq('role', 'admin')
        .neq('id', request.user_id),
    ]);
    if (!admins?.length) return;

    const { data: links } = await db
      .from('telegram_links')
      .select('user_id, chat_id')
      .in(
        'user_id',
        admins.map((a) => a.id),
      );

    await Promise.all(
      (links ?? []).map((link) => {
        const locale = toBotLocale(
          admins.find((a) => a.id === link.user_id)?.preferred_locale,
        );
        return deliver(
          link.chat_id,
          newQuestionMessage(locale, {
            nickname: asker?.nickname ?? '',
            moveSan: request.move_san,
            body: request.body,
            url: `${origin}/${locale}/admin?request=${requestId}`,
          }),
        );
      }),
    );
  } catch (e) {
    console.error('telegram notifyAdminsOfQuestion failed', e);
  }
}

export async function notifyStudentOfAnswer(
  requestId: string,
  origin: string,
): Promise<void> {
  if (!telegramConfig()) return;
  try {
    const db = createAdminClient();
    const { data: request } = await db
      .from('coaching_requests')
      .select('user_id, move_san')
      .eq('id', requestId)
      .maybeSingle();
    if (!request) return;

    const { data: link } = await db
      .from('telegram_links')
      .select('chat_id')
      .eq('user_id', request.user_id)
      .maybeSingle();
    if (!link) return;

    const { data: profile } = await db
      .from('user_profiles')
      .select('preferred_locale')
      .eq('id', request.user_id)
      .maybeSingle();
    const locale = toBotLocale(profile?.preferred_locale);

    await deliver(
      link.chat_id,
      answeredMessage(locale, {
        moveSan: request.move_san,
        url: `${origin}/${locale}/coaching?tab=answered`,
      }),
    );
  } catch (e) {
    console.error('telegram notifyStudentOfAnswer failed', e);
  }
}

// Unanswered questions, oldest first, for the bot's /new command. Throws on
// DB errors: the webhook decides how to answer.
export async function unansweredList(
  origin: string,
  locale: BotLocale,
  now: Date,
): Promise<BotMessage> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('coaching_requests')
    .select('id, user_id, move_san, created_at, coaching_responses(id)')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const open = (data ?? []).filter((r) => r.coaching_responses.length === 0);
  const { data: profiles } = open.length
    ? await db
        .from('user_profiles')
        .select('id, nickname')
        .in(
          'id',
          open.map((r) => r.user_id),
        )
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.nickname]));

  return questionListMessage(
    locale,
    open.map((r) => ({
      nickname: names.get(r.user_id) ?? '',
      moveSan: r.move_san,
      createdAt: r.created_at,
      url: `${origin}/${locale}/admin?request=${r.id}`,
    })),
    `${origin}/${locale}/admin`,
    now,
  );
}
