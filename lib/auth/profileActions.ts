'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export type ProfileFormState =
  | { error: string }
  | { success: true }
  | undefined;

// Chess.com nicknames: alphanumeric + '-' / '_', 3-25 chars (per their docs).
const CHESSCOM_RE = /^[a-zA-Z0-9_-]{3,25}$/;
// Lichess: 2-20 chars, same charset.
const LICHESS_RE = /^[a-zA-Z0-9_-]{2,20}$/;

export async function updateExternalUsernames(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const t = await getTranslations('profile.errors');

  // Empty string -> null so the user can clear a previously-set value.
  const chesscom = String(formData.get('chesscom_username') ?? '').trim();
  const lichess = String(formData.get('lichess_username') ?? '').trim();

  if (chesscom && !CHESSCOM_RE.test(chesscom)) {
    return { error: t('chesscomFormat') };
  }

  if (lichess && !LICHESS_RE.test(lichess)) {
    return { error: t('lichessFormat') };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t('notAuthenticated') };
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      chesscom_username: chesscom || null,
      lichess_username: lichess || null,
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/[locale]/profile', 'page');
  return { success: true };
}
