import type { Metadata } from 'next';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { getAuthedUser } from '@/lib/auth/getUser';
import { isStaff } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import PageLayout from '@/app/components/PageLayout';
import CoachApplicationForm from '@/app/components/CoachApplicationForm';
import { buttonVariants } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('coaches.apply');
  return { title: t('metaTitle') };
}

const FORM_FIELDS = [
  'first_name',
  'last_name',
  'title',
  'fide_id',
  'chesscom_username',
  'lichess_username',
  'about',
] as const;

// Apply to become a coach (spec 020): the form, or where the latest
// application stands.
export default async function BecomeCoachPage() {
  const [user, locale] = await Promise.all([getAuthedUser(), getLocale()]);
  if (!user) return redirect({ href: '/login', locale });

  const t = await getTranslations('coaches.apply');

  if (isStaff(user.role)) {
    return (
      <PageLayout title={t('title')} maxWidth="2xl">
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-foreground">{t('alreadyCoach')}</p>
            <Link href="/admin" className={buttonVariants({ size: 'sm' })}>
              {t('openQuestions')}
            </Link>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const supabase = await createClient();
  const { data: latest } = await supabase
    .from('coach_applications')
    .select(
      'status, created_at, first_name, last_name, title, fide_id, chesscom_username, lichess_username, about',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.status === 'pending') {
    const format = await getFormatter();
    return (
      <PageLayout title={t('title')} maxWidth="2xl">
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="font-medium text-foreground">{t('pending')}</p>
            <p className="text-sm text-muted-foreground">
              {t('pendingSince', {
                date: format.dateTime(new Date(latest.created_at), {
                  dateStyle: 'medium',
                }),
              })}
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  let initial: Partial<Record<(typeof FORM_FIELDS)[number], string>>;
  if (latest) {
    initial = Object.fromEntries(
      FORM_FIELDS.map((key) => [key, latest[key] ?? '']),
    );
  } else {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('chesscom_username, lichess_username')
      .eq('id', user.id)
      .maybeSingle();
    initial = {
      chesscom_username: profile?.chesscom_username ?? '',
      lichess_username: profile?.lichess_username ?? '',
    };
  }

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')} maxWidth="2xl">
      {latest?.status === 'rejected' && (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {t('rejected')}
        </p>
      )}
      <CoachApplicationForm initial={initial} />
    </PageLayout>
  );
}
