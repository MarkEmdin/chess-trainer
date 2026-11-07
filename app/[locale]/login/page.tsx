import { redirect } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import AuthForm from '@/app/components/AuthForm';
import { getAuthedUser } from '@/lib/auth/getUser';

export default async function LoginPage({
  searchParams,
}: PageProps<'/[locale]/login'>) {
  const user = await getAuthedUser();
  if (user) {
    const locale = await getLocale();
    redirect({ href: '/', locale });
  }
  // /auth/confirm sends dead confirmation/reset links here.
  const { error } = await searchParams;
  const t = await getTranslations('auth.errors');
  const notices: Record<string, string> = {
    link_expired: t('linkExpired'),
    google_failed: t('googleFailed'),
  };
  const notice = typeof error === 'string' ? notices[error] : undefined;
  return <AuthForm mode="login" notice={notice} />;
}
