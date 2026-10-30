import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { toBotLocale, type BotLocale } from './messages';

const TOKEN_TTL_MS = 15 * 60 * 1000;

async function getProfile(userId: string) {
  const { data } = await createAdminClient()
    .from('user_profiles')
    .select('nickname, role, preferred_locale')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export async function createLinkToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const token = randomBytes(24).toString('base64url');
  await admin.from('telegram_link_tokens').delete().eq('user_id', userId);
  const { error } = await admin.from('telegram_link_tokens').insert({
    token,
    user_id: userId,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });
  if (error) throw new Error(error.message);
  return token;
}

export async function consumeLinkToken(
  token: string,
  chatId: number,
): Promise<{ nickname: string; isAdmin: boolean; locale: BotLocale } | null> {
  const admin = createAdminClient();
  // Delete-and-return is atomic: only one caller can claim a token.
  const { data: claimed } = await admin
    .from('telegram_link_tokens')
    .delete()
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .select('user_id');
  const userId = claimed?.[0]?.user_id as string | undefined;
  if (!userId) return null;

  // chat_id is unique: free it from any other account before (re)linking.
  await admin.from('telegram_links').delete().eq('chat_id', chatId);
  const { error } = await admin
    .from('telegram_links')
    .upsert({ user_id: userId, chat_id: chatId }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);

  const profile = await getProfile(userId);
  return {
    nickname: profile?.nickname ?? '',
    isAdmin: profile?.role === 'admin',
    locale: toBotLocale(profile?.preferred_locale),
  };
}

export async function findLinkByChat(
  chatId: number,
): Promise<{ userId: string; isAdmin: boolean; locale: BotLocale } | null> {
  const { data: link } = await createAdminClient()
    .from('telegram_links')
    .select('user_id')
    .eq('chat_id', chatId)
    .maybeSingle();
  if (!link) return null;
  const profile = await getProfile(link.user_id);
  return {
    userId: link.user_id,
    isAdmin: profile?.role === 'admin',
    locale: toBotLocale(profile?.preferred_locale),
  };
}

export async function unlinkChat(chatId: number): Promise<void> {
  await createAdminClient()
    .from('telegram_links')
    .delete()
    .eq('chat_id', chatId);
}
