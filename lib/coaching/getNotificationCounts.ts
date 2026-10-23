import { createClient } from '@/lib/supabase/server';
import type { AuthedUser } from '@/lib/auth/getUser';
import { countNotifications, type NotificationCounts } from './notifications';

// Header bell counts, read on the server. No `user_id` filter: an admin
// needs every request for the "new questions" count, and RLS already
// limits a student to their own.
export async function getNotificationCounts(
  user: AuthedUser,
): Promise<NotificationCounts> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coaching_requests')
    .select('user_id, response_seen_at, coaching_responses (id)');

  if (error || !data) {
    return {
      unseenAnswers: 0,
      newQuestions: user.role === 'admin' ? 0 : null,
    };
  }
  return countNotifications(data, user);
}
