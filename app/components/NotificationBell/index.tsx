import { getTranslations } from 'next-intl/server';
import { BellIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/app/components/ui/button';
import { getAuthedUser } from '@/lib/auth/getUser';
import { getNotificationCounts } from '@/lib/coaching/getNotificationCounts';
import { cn } from '@/lib/utils';
import AdminBellMenu from './AdminBellMenu';
import BadgePill from './BadgePill';

// Header bell (spec 012): red = the user's unopened answers; admins also
// get green = student questions with no response, and a menu to pick.
export default async function NotificationBell() {
  const user = await getAuthedUser();
  if (!user) return null;

  const [t, counts] = await Promise.all([
    getTranslations('notifications'),
    getNotificationCounts(user),
  ]);

  if (counts.newQuestions !== null) {
    return (
      <AdminBellMenu
        unseenAnswers={counts.unseenAnswers}
        newQuestions={counts.newQuestions}
        label={t('bellLabel', {
          answers: counts.unseenAnswers,
          questions: counts.newQuestions,
        })}
      />
    );
  }

  return (
    <Link
      href="/coaching?tab=answered"
      aria-label={t('bellLabelStudent', { answers: counts.unseenAnswers })}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'icon' }),
        'relative',
      )}
    >
      <BellIcon aria-hidden />
      <BadgePill count={counts.unseenAnswers} tone="red" />
    </Link>
  );
}
