import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import ForgotPasswordForm from '@/app/components/ForgotPasswordForm';
import { getAuthedUser } from '@/lib/auth/getUser';

export default async function ForgotPasswordPage() {
  const user = await getAuthedUser();
  if (user) {
    const locale = await getLocale();
    redirect({ href: '/', locale });
  }
  return <ForgotPasswordForm />;
}
