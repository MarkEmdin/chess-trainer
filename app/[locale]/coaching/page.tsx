import { Link, redirect } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/app/components/ui/button';
import PageLayout from '@/app/components/PageLayout';
import CoachingThreadCard, {
  type CoachingThread,
} from '@/app/components/CoachingThreadCard';

type Tab = 'waiting' | 'answered';

export default async function CoachingPage({
  searchParams,
}: PageProps<'/[locale]/coaching'>) {
  const user = await getAuthedUser();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: '/login', locale });
  }

  const t = await getTranslations('coachingPage');
  // The tab lives in the URL so reloads and back/forward keep it.
  const tab: Tab =
    (await searchParams).tab === 'answered' ? 'answered' : 'waiting';

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
        variation,
        content,
        move_index,
        pgn,
        coaching_responses (
          body,
          created_at,
          variation,
          content
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
      variation: r.variation,
      content: r.content,
      move_index: r.move_index,
      pgn: r.pgn,
      responses: r.coaching_responses ?? [],
    })) ?? [];

  const byTab: Record<Tab, CoachingThread[]> = {
    waiting: threads.filter((th) => th.responses.length === 0),
    answered: threads.filter((th) => th.responses.length > 0),
  };
  const shown = byTab[tab];

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      {threads.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <>
          <div className="flex gap-2 mb-4" role="tablist">
            {(['waiting', 'answered'] as const).map((key) => (
              <Link
                key={key}
                href={
                  key === 'waiting' ? '/coaching' : '/coaching?tab=answered'
                }
                role="tab"
                aria-selected={tab === key}
                className={buttonVariants({
                  variant: tab === key ? 'default' : 'outline',
                  size: 'sm',
                })}
              >
                {t(`tabs.${key}`, { count: byTab[key].length })}
              </Link>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="text-muted-foreground">
              {t(tab === 'waiting' ? 'emptyWaiting' : 'emptyAnswered')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {shown.map((thread) => (
                <CoachingThreadCard key={thread.id} thread={thread} />
              ))}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
