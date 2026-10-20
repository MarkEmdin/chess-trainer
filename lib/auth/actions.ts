'use server';

import { headers } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPendingEmail, setPendingEmail } from '@/lib/auth/pendingEmail';

export type AuthFormState =
  | { error: string; suggest?: 'register' | 'login' | 'resend' }
  | { success: string }
  | undefined;

// 3-30 chars, letters/digits/underscore/hyphen — keeps nicknames URL-safe
// and prevents LIKE-wildcard tricks in lookups.
const NICKNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('auth.errors');
  const currentLocale = await getLocale();
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
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Supabase checks the password before confirmation, so only the account's
  // owner gets here — safe to remember the address for /check-email.
  if (error?.code === 'email_not_confirmed') {
    await setPendingEmail(email);
    return { error: t('emailNotConfirmed'), suggest: 'resend' };
  }

  if (error || !data.user) {
    return { error: t('wrongPassword') };
  }

  // Honour the user's stored language preference over the URL they
  // landed on. Falls back to whatever locale they were already viewing.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('preferred_locale')
    .eq('id', data.user.id)
    .single();

  redirect({ href: '/', locale: profile?.preferred_locale ?? currentLocale });
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('auth.errors');
  const currentLocale = await getLocale();
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

  // The trigger reads options.data.nickname and preferred_locale out of
  // raw_user_meta_data and writes them to user_profiles. We seed
  // preferred_locale with the user's current page language so the post-
  // login redirect (and any other locale-aware lookup) finds something
  // sensible right away.
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname, preferred_locale: currentLocale } },
  });

  if (error) {
    return { error: error.message };
  }

  // With confirmations on there is no session yet. An already-registered
  // email also lands here (Supabase answers success without sending), so
  // the response never reveals which addresses have accounts.
  await setPendingEmail(email);
  redirect({ href: '/check-email', locale: currentLocale });
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('auth');
  const locale = await getLocale();
  const nickname = String(formData.get('nickname') ?? '').trim();

  if (!nickname) {
    return { error: t('errors.fieldsRequired') };
  }

  const admin = createAdminClient();
  const { data: email } = await admin.rpc('lookup_email_by_nickname', {
    p_nickname: nickname,
  });

  if (email) {
    const origin = (await headers()).get('origin');
    const next = encodeURIComponent(`/${locale}/reset-password`);
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/${locale}/auth/confirm?next=${next}`,
    });
    if (error) {
      console.error('resetPasswordForEmail failed:', error.message);
    }
  }

  // Same message whether or not the nickname matched — avoids account
  // enumeration via response timing/content.
  return { success: t('forgotPassword.success') };
}

// No inputs: the address comes from the pending_email cookie.
export async function resendConfirmation(): Promise<AuthFormState> {
  const t = await getTranslations('auth');
  const email = await getPendingEmail();

  if (email) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error?.code === 'over_email_send_rate_limit') {
      return { error: t('errors.resendTooSoon') };
    }
    if (error) {
      console.error('resend confirmation failed:', error.message);
    }
  }

  // Same message whether or not anything was sent — the account may
  // already be confirmed, or the address may belong to someone else.
  return { success: t('checkEmail.resent') };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('auth');
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!password || !confirmPassword) {
    return { error: t('errors.fieldsRequired') };
  }

  if (password.length < 6) {
    return { error: t('errors.passwordTooShort') };
  }

  if (password !== confirmPassword) {
    return { error: t('errors.passwordMismatch') };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.name === 'AuthSessionMissingError') {
      return { error: t('errors.sessionExpired') };
    }
    return { error: error.message };
  }

  // Password reset should outlive a stolen session — sign out every other
  // active session now that the password has changed.
  await supabase.auth.signOut({ scope: 'others' });

  return { success: t('resetPassword.success') };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: '/', locale });
}
