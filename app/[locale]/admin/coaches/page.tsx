import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import LinkPending from '@/app/components/LinkPending';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import { isCoachTitle } from '@/lib/coaches/titles';
import type { CoachProfile } from '@/lib/coaches/displayName';
import PageLayout from '@/app/components/PageLayout';
import { buttonVariants } from '@/app/components/ui/button';
import {
  ApplicationCard,
  CoachCard,
  MyCoachProfileForm,
  type ManagedCoach,
  type PendingApplication,
} from '@/app/components/CoachManagement';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('coaches.manage');
  return { title: t('metaTitle') };
}

type Tab = 'applications' | 'coaches' | 'profile';
const TABS: readonly Tab[] = ['applications', 'coaches', 'profile'];

type ProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  title: string;
};

function toProfile(row: ProfileRow | undefined): CoachProfile | null {
  if (!row || !isCoachTitle(row.title)) return null;
  return {
    first_name: row.first_name,
    last_name: row.last_name,
    title: row.title,
  };
}

// Admin only (spec 020): review coach applications, manage coaches and
// their students, edit the admin's own coach signature. Reads go through
// RLS as the admin; writes are server actions.
export default async function CoachesPage({
  searchParams,
}: PageProps<'/[locale]/admin/coaches'>) {
  const user = await getAuthedUser();
  if (!user || user.role !== 'admin') {
    const locale = await getLocale();
    return redirect({ href: '/', locale });
  }

  const params = await searchParams;
  const tab: Tab = TABS.includes(params.tab as Tab)
    ? (params.tab as Tab)
    : 'applications';
  const t = await getTranslations('coaches.manage');
  const supabase = await createClient();

  const [{ data: applications }, { data: coaches }, { data: assignments }] =
    await Promise.all([
      supabase
        .from('coach_applications')
        .select(
          'id, user_id, created_at, first_name, last_name, title, fide_id, chesscom_username, lichess_username, about',
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('user_profiles')
        .select('id, nickname')
        .eq('role', 'coach')
        .order('nickname'),
      supabase.from('coach_students').select('student_id, coach_id'),
    ]);

  const coachIds = (coaches ?? []).map((c) => c.id);
  const peopleIds = [
    ...new Set([
      ...(applications ?? []).map((a) => a.user_id),
      ...(assignments ?? []).map((a) => a.student_id),
    ]),
  ];
  const [{ data: profiles }, { data: people }] = await Promise.all([
    supabase
      .from('coach_profiles')
      .select('user_id, first_name, last_name, title')
      .in('user_id', [...coachIds, user.id]),
    peopleIds.length
      ? supabase
          .from('user_profiles')
          .select('id, nickname')
          .in('id', peopleIds)
      : Promise.resolve({ data: [] as { id: string; nickname: string }[] }),
  ]);

  const nickname = new Map((people ?? []).map((p) => [p.id, p.nickname]));
  const profileOf = new Map(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.user_id, p]),
  );

  const pending: PendingApplication[] = (applications ?? []).flatMap((a) =>
    isCoachTitle(a.title)
      ? [{ ...a, title: a.title, nickname: nickname.get(a.user_id) ?? '—' }]
      : [],
  );
  const managed: ManagedCoach[] = (coaches ?? []).map((c) => ({
    id: c.id,
    nickname: c.nickname,
    profile: toProfile(profileOf.get(c.id)),
    students: (assignments ?? [])
      .filter((a) => a.coach_id === c.id)
      .map((a) => ({
        id: a.student_id,
        nickname: nickname.get(a.student_id) ?? '—',
      }))
      .sort((x, y) => x.nickname.localeCompare(y.nickname)),
  }));
  const mine = profileOf.get(user.id);

  const counts: Record<Tab, number | null> = {
    applications: pending.length,
    coaches: managed.length,
    profile: null,
  };

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map((key) => (
            <Link
              key={key}
              href={
                key === 'applications'
                  ? '/admin/coaches'
                  : `/admin/coaches?tab=${key}`
              }
              role="tab"
              aria-selected={tab === key}
              className={buttonVariants({
                variant: tab === key ? 'default' : 'outline',
                size: 'sm',
              })}
            >
              {counts[key] === null
                ? t(`tabs.${key}`)
                : t(`tabs.${key}`, { count: counts[key] })}
              <LinkPending />
            </Link>
          ))}
        </div>
        <Link
          href="/admin"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'ml-auto',
          })}
        >
          {t('questionsLink')}
        </Link>
      </div>

      {tab === 'applications' &&
        (pending.length === 0 ? (
          <p className="text-muted-foreground">{t('emptyApplications')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((a) => (
              <ApplicationCard key={a.id} application={a} />
            ))}
          </div>
        ))}

      {tab === 'coaches' &&
        (managed.length === 0 ? (
          <p className="text-muted-foreground">{t('emptyCoaches')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {managed.map((c) => (
              <CoachCard key={c.id} coach={c} />
            ))}
          </div>
        ))}

      {tab === 'profile' && (
        <MyCoachProfileForm
          initial={{
            first_name: mine?.first_name,
            last_name: mine?.last_name,
            title: mine?.title,
          }}
        />
      )}
    </PageLayout>
  );
}
