import { Link, redirect } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { isStaff } from '@/lib/auth/roles';
import { withAuthors } from '@/lib/coaches/authors';
import { isCoachTitle } from '@/lib/coaches/titles';
import type { CoachProfile } from '@/lib/coaches/displayName';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/app/components/ui/button';
import PageLayout from '@/app/components/PageLayout';
import CoachingAdminCard, {
  type AdminCoachingRequest,
} from '@/app/components/CoachingAdminCard';

type Tab = 'new' | 'answered';

export default async function AdminPage({
  searchParams,
}: PageProps<'/[locale]/admin'>) {
  const user = await getAuthedUser();
  // Staff (spec 020): the admin sees every question, a coach the ones RLS
  // lets them answer.
  if (!user || !isStaff(user.role)) {
    const locale = await getLocale();
    return redirect({ href: '/', locale });
  }

  const t = await getTranslations('coachingAdmin');
  // The tab lives in the URL so reloads and back/forward keep it.
  const params = await searchParams;
  const requestId = typeof params.request === 'string' ? params.request : '';

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
        variation,
        content,
        move_index,
        pgn,
        coaching_responses (body, created_at, variation, content, author_id)
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

  // Assignments: RLS gives a coach their own rows and the admin all of them.
  const [threads, { data: assignments }] = await Promise.all([
    withAuthors(
      supabase,
      (requests ?? []).map((r) => ({
        ...r,
        responses: r.coaching_responses ?? [],
      })),
    ),
    supabase.from('coach_students').select('student_id, coach_id'),
  ]);
  const coachOf = new Map(
    ((assignments ?? []) as { student_id: string; coach_id: string }[]).map(
      (a) => [a.student_id, a.coach_id],
    ),
  );

  // The admin sees which coach a student has.
  const assignedCoachIds =
    user.role === 'admin' ? [...new Set(coachOf.values())] : [];
  const { data: coachProfiles } = assignedCoachIds.length
    ? await supabase
        .from('coach_profiles')
        .select('user_id, first_name, last_name, title')
        .in('user_id', assignedCoachIds)
    : { data: [] };
  const profileOf = new Map<string, CoachProfile>(
    (
      (coachProfiles ?? []) as {
        user_id: string;
        first_name: string;
        last_name: string;
        title: string;
      }[]
    ).flatMap((p) =>
      isCoachTitle(p.title)
        ? [
            [
              p.user_id,
              {
                first_name: p.first_name,
                last_name: p.last_name,
                title: p.title,
              },
            ] as const,
          ]
        : [],
    ),
  );

  const cards: AdminCoachingRequest[] = threads.map((r) => ({
    id: r.id,
    user_nickname: nicknameById[r.user_id] ?? '—',
    game_url: r.game_url,
    fen: r.fen,
    move_san: r.move_san,
    body: r.body,
    created_at: r.created_at,
    variation: r.variation,
    content: r.content,
    move_index: r.move_index,
    pgn: r.pgn,
    responses: r.responses,
    my_student: user.role === 'coach' && coachOf.get(r.user_id) === user.id,
    assigned_coach:
      user.role === 'admin'
        ? (profileOf.get(coachOf.get(r.user_id) ?? '') ?? null)
        : null,
  }));
  // A coach's own students come first; otherwise newest first, as queried.
  cards.sort((a, b) => Number(!!b.my_student) - Number(!!a.my_student));

  const byTab: Record<Tab, AdminCoachingRequest[]> = {
    new: cards.filter((c) => c.responses.length === 0),
    answered: cards.filter((c) => c.responses.length > 0),
  };
  // A link to one question (the Telegram button) wins over ?tab.
  const tab: Tab = byTab.answered.some((c) => c.id === requestId)
    ? 'answered'
    : byTab.new.some((c) => c.id === requestId)
      ? 'new'
      : params.tab === 'answered'
        ? 'answered'
        : 'new';
  const shown = byTab[tab];

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <div className="flex gap-2 mb-4" role="tablist">
        {(['new', 'answered'] as const).map((key) => (
          <Link
            key={key}
            href={key === 'new' ? '/admin' : '/admin?tab=answered'}
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
          {t(tab === 'new' ? 'emptyNew' : 'emptyAnswered')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((card) => (
            <CoachingAdminCard
              key={card.id}
              request={card}
              autoOpen={card.id === requestId}
              viewerId={user.id}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
