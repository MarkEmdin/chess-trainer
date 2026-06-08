import { redirect } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import PageLayout from '@/app/components/PageLayout';
import CoachingAdminCard, {
  type AdminCoachingRequest,
} from '@/app/components/CoachingAdminCard';

export default async function AdminPage() {
  const user = await getAuthedUser();
  if (!user || user.role !== 'admin') {
    const locale = await getLocale();
    redirect({ href: '/', locale });
  }

  const t = await getTranslations('coachingAdmin');

  // Two queries instead of a single join: coaching_requests.user_id has
  // a FK to auth.users.id, not user_profiles.id, so PostgREST can't
  // auto-resolve the nickname through nested select. Two queries keep
  // the schema clean (no redundant FK) and at admin scale — handful of
  // requests, one admin — the round-trip cost is negligible.
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from('coaching_requests')
    .select(
      `
        id,
        user_id,
        game_url,
        fen,
        move_san,
        body,
        created_at,
        coaching_responses (body, created_at)
      `,
    )
    .order('created_at', { ascending: false });

  const userIds = [...new Set((requests ?? []).map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase
        .from('user_profiles')
        .select('id, nickname')
        .in('id', userIds)
    : { data: [] };

  const nicknameById = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.nickname]),
  );

  const cards: AdminCoachingRequest[] = (requests ?? []).map((r) => ({
    id: r.id,
    user_nickname: nicknameById[r.user_id] ?? '—',
    game_url: r.game_url,
    fen: r.fen,
    move_san: r.move_san,
    body: r.body,
    created_at: r.created_at,
    response: r.coaching_responses?.[0] ?? null,
  }));

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      {cards.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map((card) => (
            <CoachingAdminCard key={card.id} request={card} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
