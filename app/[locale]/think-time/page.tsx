import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import LongThinks from '@/app/components/LongThinks';

export default async function ThinkTimePage() {
  const t = await getTranslations('thinkTime');
  const user = await getAuthedUser();

  // Same auth-aware seed as /games: signed-in users pull their saved
  // usernames from user_profiles, guests fall back to localStorage inside
  // GamesShell.
  let initialChesscomUsername: string | null = null;
  let initialLichessUsername: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('chesscom_username, lichess_username')
      .eq('id', user.id)
      .single();
    initialChesscomUsername = data?.chesscom_username ?? null;
    initialLichessUsername = data?.lichess_username ?? null;
  }

  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">{t('subtitle')}</p>
        <LongThinks
          isAuthenticated={!!user}
          initialChesscomUsername={initialChesscomUsername}
          initialLichessUsername={initialLichessUsername}
        />
      </div>
    </div>
  );
}
