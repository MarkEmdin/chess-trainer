import { createClient } from '@/lib/supabase/server';
import type { AuthedUser } from '@/lib/auth/getUser';
import { isStaff } from '@/lib/auth/roles';
import { countNotifications, type NotificationCounts } from './notifications';

// Header bell counts, read on the server. No `user_id` filter: staff need
// every request they can see for the "new questions" count, and RLS limits
// a student to their own and a coach to the questions they may answer.
export async function getNotificationCounts(
  user: AuthedUser,
): Promise<NotificationCounts> {
  const supabase = await createClient();
  const [requests, applications] = await Promise.all([
    supabase
      .from('coaching_requests')
      .select('user_id, response_seen_at, coaching_responses (id)'),
    user.role === 'admin'
      ? supabase
          .from('coach_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      : null,
  ]);
  const pendingApplications = applications ? (applications.count ?? 0) : null;

  if (requests.error || !requests.data) {
    return {
      unseenAnswers: 0,
      newQuestions: isStaff(user.role) ? 0 : null,
      pendingApplications,
    };
  }
  return {
    ...countNotifications(requests.data, user),
    pendingApplications,
  };
}
