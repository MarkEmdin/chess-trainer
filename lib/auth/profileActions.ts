'use server';

import { revalidatePath } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { NICKNAME_RE } from '@/lib/auth/nickname';
import { serverError } from '@/lib/actionError';

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
  // Unchecked checkboxes are absent from FormData, so absence means hidden.
  const showInLeaderboard = formData.get('show_in_leaderboard') === 'on';

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
      show_in_leaderboard: showInLeaderboard,
    })
    .eq('id', user.id);

  if (error) {
    return serverError('updateExternalUsernames failed', error);
  }

  revalidatePath('/[locale]/profile', 'page');
  return { success: true };
}

async function saveNickname(formData: FormData): Promise<ProfileFormState> {
  const t = await getTranslations('auth.errors');
  const nickname = String(formData.get('nickname') ?? '').trim();

  if (!NICKNAME_RE.test(nickname)) {
    return { error: t('nicknameFormat') };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_nickname', {
    p_nickname: nickname,
  });

  if (error?.code === '23505') {
    return { error: t('nicknameTaken') };
  }
  if (error) {
    return serverError('set_nickname failed', error);
  }

  // The layout, because the header shows the nickname on every page.
  revalidatePath('/[locale]', 'layout');
  return { success: true };
}

export async function updateNickname(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  return saveNickname(formData);
}

export async function chooseNickname(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const result = await saveNickname(formData);
  if (result && 'error' in result) return result;
  redirect({ href: '/', locale: await getLocale() });
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

// Lichess equivalent of updateChesscomUsername — same reasoning: mirrors a
// value the user typed in the Lichess lookup form (validated loosely by the
// platform's own 404 response), fire-and-forget, no-op for guests.
export async function updateLichessUsername(
  username: string | null,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const trimmed = username?.trim();
  await supabase
    .from('user_profiles')
    .update({ lichess_username: trimmed || null })
    .eq('id', user.id);
}
