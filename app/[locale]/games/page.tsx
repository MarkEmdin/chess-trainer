import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import ChessComGames from '@/app/components/ChessComGames';

export default async function GamesPage() {
  const t = await getTranslations('games');
  const user = await getAuthedUser();

  // Signed-in visitors get their chess.com username from user_profiles
  // (the single source of truth, replacing localStorage). Guests get
  // null and fall through to the localStorage flow in ChessComShell.
  let initialUsername: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('chesscom_username')
      .eq('id', user.id)
      .single();
    initialUsername = data?.chesscom_username ?? null;
  }

  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">{t('subtitle')}</p>
        <ChessComGames
          isAuthenticated={!!user}
          initialUsername={initialUsername}
        />
      </div>
    </div>
  );
}
