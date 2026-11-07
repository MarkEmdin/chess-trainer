import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import ChooseNicknameForm from '@/app/components/ChooseNicknameForm';
import { getAuthedUser } from '@/lib/auth/getUser';

export default async function ChooseNicknamePage() {
  const [user, locale] = await Promise.all([getAuthedUser(), getLocale()]);
  if (!user) return redirect({ href: '/login', locale });
  if (user.nicknameSet) return redirect({ href: '/', locale });
  return <ChooseNicknameForm />;
}
