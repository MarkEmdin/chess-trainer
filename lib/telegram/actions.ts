'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import { telegramConfig } from './config';
import { createLinkToken } from './link';

export async function startTelegramLink(): Promise<
  { url: string } | { error: string }
> {
  const user = await getAuthedUser();
  const config = telegramConfig();
  const t = await getTranslations('telegram.errors');
  if (!user) return { error: t('notAuthenticated') };
  if (!config) return { error: t('connectFailed') };
  try {
    const token = await createLinkToken(user.id);
    return { url: `https://t.me/${config.username}?start=${token}` };
  } catch {
    return { error: t('connectFailed') };
  }
}

export async function disconnectTelegram(): Promise<void> {
  const user = await getAuthedUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from('telegram_links').delete().eq('user_id', user.id);
  revalidatePath('/[locale]/profile', 'page');
}
