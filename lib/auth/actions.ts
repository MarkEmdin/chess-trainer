'use server';

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuthFormState =
  | { error: string; suggest?: 'register' | 'login' }
  | undefined;

// 3-30 chars, letters/digits/underscore/hyphen — keeps nicknames URL-safe
// and prevents LIKE-wildcard tricks in lookups.
const NICKNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('auth.errors');
  const nickname = String(formData.get('nickname') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!nickname || !password) {
    return { error: t('fieldsRequired') };
  }

  // Translate nickname -> email server-side. Uses service_role because
  // anonymous users have no SELECT on other people's profiles via RLS.
  const admin = createAdminClient();
  const { data: email } = await admin.rpc('lookup_email_by_nickname', {
    p_nickname: nickname,
  });

  if (!email) {
    return { error: t('noAccount'), suggest: 'register' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: t('wrongPassword') };
  }

  redirect('/');
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('auth.errors');
  const email = String(formData.get('email') ?? '').trim();
  const nickname = String(formData.get('nickname') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !nickname || !password) {
    return { error: t('fieldsRequired') };
  }

  if (!NICKNAME_RE.test(nickname)) {
    return { error: t('nicknameFormat') };
  }

  // Pre-check for a taken nickname so we can return a clean message instead
  // of the raw unique-violation that the trigger would otherwise throw.
  // Race-condition acceptable: the DB unique index is the source of truth.
  const admin = createAdminClient();
  const { data: existingEmail } = await admin.rpc(
    'lookup_email_by_nickname',
    { p_nickname: nickname },
  );

  if (existingEmail) {
    return { error: t('nicknameTaken'), suggest: 'login' };
  }

  // The trigger reads options.data.nickname out of raw_user_meta_data and
  // writes it to user_profiles.
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
