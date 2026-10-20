import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import CheckEmail from '@/app/components/CheckEmail';
import { getAuthedUser } from '@/lib/auth/getUser';
import { getPendingEmail } from '@/lib/auth/pendingEmail';
import { maskEmail } from '@/lib/auth/maskEmail';

export default async function CheckEmailPage() {
  const locale = await getLocale();
  if (await getAuthedUser()) {
    redirect({ href: '/', locale });
  }

  // Direct visit or the cookie expired: nothing to show or resend.
  const email = await getPendingEmail();
  if (!email) {
    return redirect({ href: '/login', locale });
  }

  return <CheckEmail maskedEmail={maskEmail(email)} />;
}
