import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import AuthForm from '@/app/components/AuthForm';
import { getAuthedUser } from '@/lib/auth/getUser';

export default async function LoginPage() {
  const user = await getAuthedUser();
  if (user) {
    const locale = await getLocale();
    redirect({ href: '/', locale });
  }
  return <AuthForm mode="login" />;
}
