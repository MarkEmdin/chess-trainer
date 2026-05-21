'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';

export type ProfileFormState =
  | { error: string }
  | { success: true }
  | undefined;

// Chess.com nicknames: alphanumeric + '-' / '_', 3-25 chars (per their docs).
const CHESSCOM_RE = /^[a-zA-Z0-9_-]{3,25}$/;
// Lichess: 2-20 chars, same charset.
const LICHESS_RE = /^[a-zA-Z0-9_-]{2,20}$/;

const SUPPORTED_LOCALES: ReadonlySet<string> = new Set(routing.locales);

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

// Fire-and-forget DB write triggered by the language toggle. Silently
// no-op for guests so the toggle stays callable from any client context.
// Doesn't throw on validation failure either — the toggle UI doesn't need
// to know about server-side errors for a non-critical preference.
export async function updatePreferredLocale(locale: string): Promise<void> {
  if (!SUPPORTED_LOCALES.has(locale)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from('user_profiles')
    .update({ preferred_locale: locale })
    .eq('id', user.id);
}

// Sets the user's chess.com username from anywhere on the site (used by
// the /games and /think-time username form when the visitor is signed in,
// so the value lives in one place — profile — rather than localStorage).
// Pass null to clear.
export async function updateChesscomUsername(
  username: string | null,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const trimmed = username?.trim();
  // Skip format validation here: this action mirrors a value the user
  // typed in the chess.com lookup form (which already validates loosely
  // via the platform's 404 response). Empty -> null clears.
  await supabase
    .from('user_profiles')
    .update({ chesscom_username: trimmed || null })
    .eq('id', user.id);
}
