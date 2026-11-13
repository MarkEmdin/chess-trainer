import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getAuthedUser } from '@/lib/auth/getUser';
import { getLeaderboard } from '@/lib/leaderboard/getLeaderboard';
import PageLayout from '@/app/components/PageLayout';
import Leaderboard from '@/app/components/Leaderboard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('leaderboard');
  return { title: t('metaTitle') };
}

export default async function LeaderboardPage() {
  const user = await getAuthedUser();
  if (!user) {
    const locale = await getLocale();
    return redirect({ href: '/login', locale });
  }

  const t = await getTranslations('leaderboard');
  const rows = await getLeaderboard();

  return (
    <PageLayout title={t('title')}>
      <Leaderboard rows={rows} />
    </PageLayout>
  );
}
