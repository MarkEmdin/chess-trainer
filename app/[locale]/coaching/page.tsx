import { redirect } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import PageLayout from '@/app/components/PageLayout';
import CoachingThreadCard, {
  type CoachingThread,
} from '@/app/components/CoachingThreadCard';

export default async function CoachingPage() {
  const user = await getAuthedUser();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: '/login', locale });
  }

  const t = await getTranslations('coachingPage');

  const supabase = await createClient();
  const { data } = await supabase
    .from('coaching_requests')
    .select(
      `
        id,
        game_url,
        fen,
        move_san,
        body,
        created_at,
        coaching_responses (
          body,
          created_at
        )
      `,
    )
    .order('created_at', { ascending: false });

  const threads: CoachingThread[] =
    data?.map((r) => ({
      id: r.id,
      game_url: r.game_url,
      fen: r.fen,
      move_san: r.move_san,
      body: r.body,
      created_at: r.created_at,
      responses: r.coaching_responses ?? [],
    })) ?? [];

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      {threads.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {threads.map((thread) => (
            <CoachingThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
