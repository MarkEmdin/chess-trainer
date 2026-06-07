import { redirect } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/app/components/ProfileForm';

export default async function ProfilePage() {
  const user = await getAuthedUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('chesscom_username, lichess_username')
    .eq('id', user.id)
    .single();

  const t = await getTranslations('profile');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>
      <ProfileForm
        initial={{
          chesscom: profile?.chesscom_username ?? '',
          lichess: profile?.lichess_username ?? '',
        }}
      />
    </main>
  );
}
