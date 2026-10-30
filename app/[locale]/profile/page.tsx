import { redirect } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import PageLayout from '@/app/components/PageLayout';
import ProfileForm from '@/app/components/ProfileForm';
import TelegramConnect from '@/app/components/TelegramConnect';
import { Card, CardContent } from '@/app/components/ui/card';
import { telegramConfig } from '@/lib/telegram/config';

export default async function ProfilePage() {
  const [user, locale] = await Promise.all([getAuthedUser(), getLocale()]);
  if (!user) return redirect({ href: '/login', locale });

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('chesscom_username, lichess_username')
    .eq('id', user!.id)
    .single();

  const showTelegram = telegramConfig() !== null;
  const { data: link } = showTelegram
    ? await supabase
        .from('telegram_links')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };

  const t = await getTranslations('profile');

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')} maxWidth="2xl">
      <ProfileForm
        initial={{
          chesscom: profile?.chesscom_username ?? '',
          lichess: profile?.lichess_username ?? '',
        }}
      />
      {showTelegram && (
        <Card className="mt-8">
          <CardContent>
            <TelegramConnect
              connected={link !== null}
              isAdmin={user.role === 'admin'}
            />
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}
