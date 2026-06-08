import { redirect } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import PageLayout from '@/app/components/PageLayout';
import ProfileForm from '@/app/components/ProfileForm';

export default async function ProfilePage() {
  const [user, locale] = await Promise.all([getAuthedUser(), getLocale()]);
  if (!user) return redirect({ href: '/login', locale });

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('chesscom_username, lichess_username')
    .eq('id', user!.id)
    .single();

  const t = await getTranslations('profile');

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')} maxWidth="2xl">
      <ProfileForm
        initial={{
          chesscom: profile?.chesscom_username ?? '',
          lichess: profile?.lichess_username ?? '',
        }}
      />
    </PageLayout>
  );
}
